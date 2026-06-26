// OpenFall — desktop persistence. Thin wrapper over the contextBridge API exposed
// by electron/preload.ts. Imports NO electron modules itself, so it is safe to
// include in any bundle; all native work happens in the main process.
import type {
  PlatformAdapter,
  OpenFallBridge,
  ExportFileOpts,
  ExportFileResult,
  WindowAction,
  Rect,
} from './adapter'
import type { PersistedSnapshot } from '../types'

export class ElectronAdapter implements PlatformAdapter {
  readonly kind = 'electron' as const
  constructor(private readonly bridge: OpenFallBridge) {}

  load(): Promise<PersistedSnapshot | null> {
    return this.bridge.load()
  }
  save(snapshot: PersistedSnapshot): Promise<void> {
    return this.bridge.save(snapshot)
  }
  exportFile(opts: ExportFileOpts): Promise<ExportFileResult> {
    return this.bridge.exportFile(opts)
  }
  chooseDirectory(): Promise<string | null> {
    return this.bridge.chooseDirectory()
  }
  openFile(): Promise<{ name: string; content: string } | null> {
    return this.bridge.openFile()
  }
  windowControl(action: WindowAction): void {
    this.bridge.windowControl(action)
  }
  separateWindow(leafId: string): void {
    this.bridge.separateWindow(leafId)
  }
  getBounds(): Promise<Rect | null> {
    return this.bridge.getBounds()
  }
  setBounds(rect: Rect): void {
    this.bridge.setBounds(rect)
  }
  printContent(html: string): void {
    this.bridge.printContent(html)
  }
}
