import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  nativeImage,
  safeStorage,
  shell,
  Tray,
  type MenuItemConstructorOptions
} from 'electron'
import { join } from 'node:path'

import { createAllmoneConfigStore } from './runtime/allmoneConfigStore'
import { createCliProxyApiConfigWriter } from './runtime/cliproxyapiConfigWriter'
import { createCliProxyApiInstaller } from './runtime/cliproxyapiInstaller'
import { createCliProxyApiProcessController } from './runtime/cliproxyapiProcessController'
import { registerRuntimeIpcHandlers } from './runtime/ipc'
import { resolveRuntimeHome } from './runtime/runtimeHome'
import { createRuntimeService } from './runtime/service'
import { createRuntimeSettingsStore } from './runtime/settingsStore'
import { createTrayController } from './runtime/trayController'

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL)
let stopManagedRuntime: (() => Promise<unknown>) | undefined
let quitAfterRuntimeStop = false
let mainWindow: BrowserWindow | undefined

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'allm-one',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow = window

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = undefined
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
    return window
  }

  window.loadFile(join(__dirname, '../renderer/index.html'))
  return window
}

function openMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

app.whenReady().then(async () => {
  const runtimeHome = resolveRuntimeHome()
  const allmoneConfigStore = createAllmoneConfigStore({
    runtimeHome
  })
  const settingsStore = createRuntimeSettingsStore({
    app,
    safeStorage,
    filePath: runtimeHome.runtimeSettingsPath,
    oldSettingsFilePath: join(app.getPath('userData'), 'runtime-settings.json')
  })
  await settingsStore.ensureManagementKey()

  const cliProxyApiConfigWriter = createCliProxyApiConfigWriter({
    runtimeHome,
    configStore: allmoneConfigStore
  })
  const installer = createCliProxyApiInstaller({
    runtimeHome,
    configStore: allmoneConfigStore
  })
  const processController = createCliProxyApiProcessController({
    runtimeHome,
    configStore: allmoneConfigStore,
    configWriter: cliProxyApiConfigWriter,
    installer,
    getManagementKey: async () =>
      (await settingsStore.ensureManagementKey()).managementKey
  })
  const runtimeService = createRuntimeService({
    settingsStore,
    allmoneConfigStore,
    cliProxyApiConfigWriter,
    cliProxyApiProcessController: processController
  })
  stopManagedRuntime = () => processController.stop()

  await allmoneConfigStore.load()
  await runtimeService.initialize()
  const trayController = createTrayController({
    createTray: () => new Tray(createTrayImage()),
    buildMenu: (items) =>
      Menu.buildFromTemplate(items as MenuItemConstructorOptions[]),
    getState: () => runtimeService.getState(),
    openMainWindow,
    copyApiBase: () => {
      const apiBaseUrl = runtimeService.getState().software?.runtime.apiBaseUrl

      if (apiBaseUrl) {
        clipboard.writeText(apiBaseUrl)
      }
    },
    start: () => runtimeService.startManagedRuntime(),
    restart: () => runtimeService.restartManagedRuntime(),
    stop: () => runtimeService.stopManagedRuntime(),
    checkForUpdate: () => runtimeService.checkForUpdate(),
    quit: () => app.quit()
  })

  trayController.update()
  void runtimeService.ensureInstalledThenStart().finally(() => {
    trayController.update()
  })

  ipcMain.handle('app:get-version', () => app.getVersion())
  registerRuntimeIpcHandlers({ ipcMain, runtimeService, clipboard })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      return
    }

    openMainWindow()
  })
})

app.on('before-quit', (event) => {
  if (quitAfterRuntimeStop || !stopManagedRuntime) {
    return
  }

  event.preventDefault()
  void stopManagedRuntime().finally(() => {
    quitAfterRuntimeStop = true
    app.quit()
  })
})

app.on('window-all-closed', () => {
  // Keep the tray available for runtime control after the window is closed.
})

function createTrayImage(): Electron.NativeImage {
  const svg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="4" fill="#12343b"/><path d="M5 11.5 8 4l5 10-3-2.5-2 2-3-2z" fill="#d7f4ec"/></svg>'
  )

  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`)
}
