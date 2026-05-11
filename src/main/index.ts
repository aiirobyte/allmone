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
import { createCliProxyApiClient } from './cli-proxy-api'
import { createModelsService } from './models'
import {
  createProviderLoginRunner,
  createUpstreamService
} from './upstreams'

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
    runtimeHome,
    safeStorage
  })
  const settingsStore = createRuntimeSettingsStore({
    app,
    safeStorage,
    filePath: runtimeHome.managementKeyPath,
    oldSettingsFilePaths: [
      join(app.getPath('userData'), 'runtime-settings.json'),
      join(runtimeHome.rootDir, 'runtime', 'runtime-settings.json'),
      join(runtimeHome.runtimeDir, 'runtime-settings.json')
    ]
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
  stopManagedRuntime = () => processController.shutdownAll()

  await allmoneConfigStore.load()
  await createModelsService({
    configStore: allmoneConfigStore,
    configWriter: cliProxyApiConfigWriter
  }).ensureDefaultLocalOutputKey()
  await runtimeService.initialize()
  const managementKey = (await settingsStore.ensureManagementKey()).managementKey
  const upstreamService = createUpstreamService({
    configStore: allmoneConfigStore,
    client: createCliProxyApiClient({
      baseUrl: runtimeService.getState().connection.baseUrl,
      timeoutMs: runtimeService.getState().connection.timeoutMs,
      managementKey
    })
  })
  const providerLoginRunner = createProviderLoginRunner({
    executablePath: runtimeHome.cliProxyApiExecutablePath,
    configPath: runtimeHome.runtimeConfigPath,
    runtimeDir: runtimeHome.runtimeDir
  })
  const modelsService = createModelsService({
    configStore: allmoneConfigStore,
    configWriter: cliProxyApiConfigWriter,
    upstreamService
  })
  const trayController = createTrayController({
    createTray: () => new Tray(createTrayImage()),
    buildMenu: (items) =>
      Menu.buildFromTemplate(items as MenuItemConstructorOptions[]),
    getState: () => runtimeService.getState(),
    openMainWindow,
    copyApiBase: () => {
      const serviceOrigin = runtimeService.getState().software?.runtime.serviceOrigin

      if (serviceOrigin) {
        clipboard.writeText(serviceOrigin)
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
  registerRuntimeIpcHandlers({
    ipcMain,
    runtimeService,
    modelsService,
    upstreamService,
    providerLoginRunner,
    clipboard
  })

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
  for (const path of [
    join(app.getAppPath(), 'assets', 'meow-cat-icon.svg'),
    join(__dirname, '../../assets/meow-cat-icon.svg')
  ]) {
    const image = nativeImage.createFromPath(path)

    if (!image.isEmpty()) {
      const trayImage = image.resize({ width: 18, height: 18 })

      trayImage.setTemplateImage(true)
      return trayImage
    }
  }

  const svg = encodeURIComponent(
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">',
      '<path fill="#000" d="M4.2 7.8 5.1 3.3l3 2.6h1.8l3-2.6.9 4.5v2.8c0 3.1-2.1 5.2-4.8 5.2s-4.8-2.1-4.8-5.2V7.8Z"/>',
      '<path fill="#fff" d="M6.7 9.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm4.6 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"/>',
      '<path fill="#fff" d="M9 10.2c.5 0 .9.3.9.7s-.4.7-.9.7-.9-.3-.9-.7.4-.7.9-.7Z"/>',
      '</svg>'
    ].join('')
  )

  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${svg}`
  )

  const trayImage = image.resize({ width: 18, height: 18 })

  trayImage.setTemplateImage(true)
  return trayImage
}
