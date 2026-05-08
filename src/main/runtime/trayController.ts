import type { RuntimeState } from './types'

export interface TrayMenuItem {
  label?: string
  type?: 'separator'
  enabled?: boolean
  click?: () => void | Promise<void>
}

export interface TrayAdapter {
  setToolTip(value: string): void
  setContextMenu(menu: unknown): void
  destroy(): void
}

export interface TrayControllerOptions {
  createTray: () => TrayAdapter
  buildMenu: (items: TrayMenuItem[]) => unknown
  getState: () => RuntimeState
  openMainWindow: () => void
  copyApiBase: () => void
  start: () => Promise<unknown>
  restart: () => Promise<unknown>
  stop: () => Promise<unknown>
  checkForUpdate: () => Promise<unknown>
  quit: () => void
}

export interface TrayController {
  update(state?: RuntimeState): void
  destroy(): void
}

export function createTrayController(
  options: TrayControllerOptions
): TrayController {
  return new DefaultTrayController(options)
}

class DefaultTrayController implements TrayController {
  private readonly options: TrayControllerOptions
  private readonly tray: TrayAdapter

  constructor(options: TrayControllerOptions) {
    this.options = options
    this.tray = options.createTray()
  }

  update(state: RuntimeState = this.options.getState()): void {
    const managedStatus = state.managed?.status ?? 'missing'
    const serviceOrigin = state.software?.runtime.serviceOrigin
    const port = state.software?.runtime.port
    const canStart = !isBusyStatus(managedStatus) && managedStatus !== 'running'
    const canControlRunning = managedStatus === 'running'
    const canCheckUpdate = !isBusyStatus(managedStatus)
    const menu = this.options.buildMenu([
      {
        label: `Status: ${managedStatusLabel(managedStatus)}`,
        enabled: false
      },
      {
        label: serviceOrigin ? `Service: ${serviceOrigin}` : 'Service: Unavailable',
        enabled: false
      },
      {
        label: port ? `Port: ${port}` : 'Port: Unavailable',
        enabled: false
      },
      { type: 'separator' },
      { label: 'Open Allmone', click: this.options.openMainWindow },
      {
        label: 'Copy Service Origin',
        enabled: Boolean(serviceOrigin),
        click: () => this.options.copyApiBase()
      },
      { type: 'separator' },
      {
        label: 'Start CLIProxyAPI',
        enabled: canStart,
        click: () => this.runAndRefresh(this.options.start)
      },
      {
        label: 'Restart CLIProxyAPI',
        enabled: canControlRunning,
        click: () => this.runAndRefresh(this.options.restart)
      },
      {
        label: 'Stop CLIProxyAPI',
        enabled: canControlRunning,
        click: () => this.runAndRefresh(this.options.stop)
      },
      {
        label: 'Check For Update',
        enabled: canCheckUpdate,
        click: () => this.runAndRefresh(this.options.checkForUpdate)
      },
      { type: 'separator' },
      { label: 'Quit allmone', click: this.options.quit }
    ])

    this.tray.setToolTip(`allmone - ${managedStatusLabel(managedStatus)}`)
    this.tray.setContextMenu(menu)
  }

  destroy(): void {
    this.tray.destroy()
  }

  private async runAndRefresh(callback: () => Promise<unknown>): Promise<void> {
    await callback()
    this.update()
  }
}

function managedStatusLabel(status: string): string {
  switch (status) {
    case 'installing':
      return 'Installing'
    case 'ready':
      return 'Ready'
    case 'starting':
      return 'Starting'
    case 'running':
      return 'Running'
    case 'stopping':
      return 'Stopping'
    case 'stopped':
      return 'Stopped'
    case 'crashed':
      return 'Crashed'
    case 'update_failed':
      return 'Update Failed'
    case 'launch_failed':
      return 'Launch Failed'
    default:
      return 'Missing'
  }
}

function isBusyStatus(status: string): boolean {
  return status === 'installing' || status === 'starting' || status === 'stopping'
}
