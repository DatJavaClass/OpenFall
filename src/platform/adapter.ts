// OpenFall — platform seam. The renderer talks ONLY to a PlatformAdapter, so the
// same React app runs as an Electron desktop client (real filesystem autosave) and
// as the portable web client (localStorage + File System Access API).
import type { PersistedSnapshot } from '../types'
import { WebAdapter } from './webAdapter'
import { ElectronAdapter } from './electronAdapter'

export interface ExportFileOpts {
  suggestedName: string // without extension
  ext: string // ".pdf"
  mime: string
  contents: string
  /** PDF: the platform renders `contents` (HTML) to PDF rather than writing it verbatim. */
  needsPrint: boolean
}
export interface ExportFileResult {
  ok: boolean
  path?: string
  error?: string
}

export type WindowAction = 'minimize' | 'maximize' | 'close'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PlatformAdapter {
  readonly kind: 'electron' | 'web'
  /** Load the persisted snapshot, or null on first run. */
  load(): Promise<PersistedSnapshot | null>
  /** Persist the snapshot (called by the autosave loop and on close). */
  save(snapshot: PersistedSnapshot): Promise<void>
  /** Convert+write an export; downloads on web, save-dialog on desktop. */
  exportFile(opts: ExportFileOpts): Promise<ExportFileResult>
  /** Pick the autosave directory; returns a display path/name or null. */
  chooseDirectory(): Promise<string | null>
  /** Open a text file into a new leaf. */
  openFile(): Promise<{ name: string; content: string } | null>
  /** Native window controls (no-ops on web). */
  windowControl(action: WindowAction): void
  /** Open the given leaf in its own window (Separate View). */
  separateWindow(leafId: string): void
  /** Current OS window bounds (null on web). */
  getBounds(): Promise<Rect | null>
  /** Resize/move the OS window (no-op on web — the browser handles resizing). */
  setBounds(rect: Rect): void
  /** Print the given HTML via the OS/browser print dialog. */
  printContent(html: string): void
}

/** The contextBridge API exposed by the Electron preload (see electron/preload.ts). */
export interface OpenFallBridge {
  isElectron: true
  load(): Promise<PersistedSnapshot | null>
  save(snapshot: PersistedSnapshot): Promise<void>
  exportFile(opts: ExportFileOpts): Promise<ExportFileResult>
  chooseDirectory(): Promise<string | null>
  openFile(): Promise<{ name: string; content: string } | null>
  windowControl(action: WindowAction): void
  separateWindow(leafId: string): void
  getBounds(): Promise<Rect | null>
  setBounds(rect: Rect): void
  printContent(html: string): void
  onMaximizeChange?(cb: (maximized: boolean) => void): void
}

declare global {
  interface Window {
    openfall?: OpenFallBridge
  }
}

let cached: PlatformAdapter | null = null

/** Select the adapter for the current runtime (ElectronAdapter wraps the injected
 *  bridge and imports no electron modules, so it is safe in the web bundle too). */
export function getAdapter(): PlatformAdapter {
  if (cached) return cached
  if (typeof window !== 'undefined' && window.openfall?.isElectron) {
    cached = new ElectronAdapter(window.openfall)
  } else {
    cached = new WebAdapter()
  }
  return cached
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.openfall?.isElectron
}
