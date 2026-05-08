import assert from 'node:assert/strict'

import { createTrayController, type TrayMenuItem } from './trayController'
import type { RuntimeState } from './types'

function runtimeState(
  overrides: Partial<RuntimeState> = {}
): RuntimeState {
  return {
    status: 'reachable',
    connection: {
      baseUrl: 'http://127.0.0.1:8317/v0/management',
      timeoutMs: 5000,
      managementKeyConfigured: true,
      managementKeyPersisted: true
    },
    software: {
      cliproxyapi: {
        releaseMetadataUrl:
          'https://api.github.com/repos/router-for-me/CLIProxyAPI/releases/latest',
        releasePageUrl: 'https://github.com/router-for-me/CLIProxyAPI/releases/latest',
        localExecutablePath: '/tmp/allmone/runtime/cli-proxy-api/bin/cli-proxy-api'
      },
      runtime: {
        host: '127.0.0.1',
        port: 8317,
        timeoutMs: 5000,
        configPath: '/tmp/allmone/runtime/cli-proxy-api/config.yaml',
        serviceOrigin: 'http://127.0.0.1:8317',
        apiBaseUrl: 'http://127.0.0.1:8317/v1',
        managementBaseUrl: 'http://127.0.0.1:8317/v0/management'
      }
    },
    managed: {
      status: 'running',
      pid: 1234
    },
    ...overrides
  }
}

function createHarness(state: RuntimeState = runtimeState()) {
  const calls: string[] = []
  let menuItems: TrayMenuItem[] = []
  const tray = {
    tooltip: '',
    contextMenu: undefined as unknown,
    destroyed: false,
    setToolTip(value: string) {
      this.tooltip = value
    },
    setContextMenu(menu: unknown) {
      this.contextMenu = menu
    },
    destroy() {
      this.destroyed = true
    }
  }
  const controller = createTrayController({
    createTray: () => tray,
    buildMenu(items) {
      menuItems = items
      return items
    },
    getState: () => state,
    openMainWindow: () => calls.push('open'),
    copyApiBase: () => calls.push('copy'),
    start: async () => calls.push('start'),
    restart: async () => calls.push('restart'),
    stop: async () => calls.push('stop'),
    checkForUpdate: async () => calls.push('check'),
    quit: () => calls.push('quit')
  })

  return {
    controller,
    calls,
    get menuItems() {
      return menuItems
    },
    tray
  }
}

test('renders tray status, service origin, and running-state command availability', () => {
  const harness = createHarness()

  harness.controller.update()

  const labels = harness.menuItems.map((item) => item.label)
  assert(labels.includes('Status: Running'))
  assert(labels.includes('Service: http://127.0.0.1:8317'))
  assert(labels.includes('Port: 8317'))
  assert.equal(harness.tray.tooltip, 'allmone - Running')
  assert.equal(harness.menuItems.find((item) => item.label === 'Start CLIProxyAPI')?.enabled, false)
  assert.equal(harness.menuItems.find((item) => item.label === 'Restart CLIProxyAPI')?.enabled, true)
  assert.equal(harness.menuItems.find((item) => item.label === 'Stop CLIProxyAPI')?.enabled, true)
})

test('renders stopped-state command availability', () => {
  const harness = createHarness(
    runtimeState({
      managed: { status: 'stopped' }
    })
  )

  harness.controller.update()

  assert.equal(harness.menuItems.find((item) => item.label === 'Start CLIProxyAPI')?.enabled, true)
  assert.equal(harness.menuItems.find((item) => item.label === 'Restart CLIProxyAPI')?.enabled, false)
  assert.equal(harness.menuItems.find((item) => item.label === 'Stop CLIProxyAPI')?.enabled, false)
})

test('wires tray menu commands to runtime callbacks', async () => {
  const harness = createHarness()

  harness.controller.update()
  await harness.menuItems.find((item) => item.label === 'Open Allmone')?.click?.()
  await harness.menuItems.find((item) => item.label === 'Copy Service Origin')?.click?.()
  await harness.menuItems.find((item) => item.label === 'Restart CLIProxyAPI')?.click?.()
  await harness.menuItems.find((item) => item.label === 'Stop CLIProxyAPI')?.click?.()
  await harness.menuItems.find((item) => item.label === 'Check For Update')?.click?.()
  await harness.menuItems.find((item) => item.label === 'Quit allmone')?.click?.()

  assert.deepEqual(harness.calls, [
    'open',
    'copy',
    'restart',
    'stop',
    'check',
    'quit'
  ])
})
