import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'
import { join } from 'node:path'

import { createAllmoneConfigStore } from './runtime/allmoneConfigStore'
import { registerRuntimeIpcHandlers } from './runtime/ipc'
import { resolveRuntimeHome } from './runtime/runtimeHome'
import { createRuntimeService } from './runtime/service'
import { createRuntimeSettingsStore } from './runtime/settingsStore'

const isDevelopment = Boolean(process.env.ELECTRON_RENDERER_URL)

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    return
  }

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  const runtimeHome = resolveRuntimeHome()
  const allmoneConfigStore = createAllmoneConfigStore({
    runtimeHome,
    oldSettingsFilePath: join(app.getPath('userData'), 'runtime-settings.json')
  })
  const settingsStore = createRuntimeSettingsStore({ app, safeStorage })
  const runtimeService = createRuntimeService({ settingsStore })

  await allmoneConfigStore.load()
  await runtimeService.initialize()

  ipcMain.handle('app:get-version', () => app.getVersion())
  registerRuntimeIpcHandlers({ ipcMain, runtimeService })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
