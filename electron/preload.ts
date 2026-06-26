// OpenFall — Electron preload.
//
// Exposes a minimal, typed `window.openfall` bridge (contextIsolation ON) that
// the renderer's ElectronAdapter consumes (see src/platform/adapter.ts →
// OpenFallBridge). No Node or Electron internals leak to the page — only the
// wrapped functions below cross the contextBridge.

import { contextBridge, ipcRenderer } from 'electron'

type WindowAction = 'minimize' | 'maximize' | 'close'

interface ExportFileOpts {
  suggestedName: string
  ext: string
  mime: string
  contents: string
  needsPrint: boolean
}
interface ExportFileResult {
  ok: boolean
  path?: string
  error?: string
}

const openfall = {
  isElectron: true as const,

  // Persistence (real files in the main process).
  load: (): Promise<unknown> => ipcRenderer.invoke('of:load'),
  save: (snapshot: unknown): Promise<void> => ipcRenderer.invoke('of:save', snapshot),

  // Export / convert (save dialog; PDF goes through printToPDF in main).
  exportFile: (opts: ExportFileOpts): Promise<ExportFileResult> =>
    ipcRenderer.invoke('of:export', opts),

  // Native pickers.
  chooseDirectory: (): Promise<string | null> => ipcRenderer.invoke('of:chooseDir'),
  openFile: (): Promise<{ name: string; content: string } | null> =>
    ipcRenderer.invoke('of:openFile'),

  // Frameless window controls (the renderer draws its own buttons).
  windowControl: (action: WindowAction): void => {
    ipcRenderer.send('of:winctl', action)
  },

  // Separate View — pop a leaf into its own window.
  separateWindow: (leafId: string): void => {
    ipcRenderer.send('of:separate', leafId)
  },

  // Window bounds, for the custom resize grips (the frameless window's real
  // edges sit out in the transparent margin and are awkward to grab).
  getBounds: (): Promise<unknown> => ipcRenderer.invoke('of:getBounds'),
  setBounds: (rect: unknown): void => {
    ipcRenderer.send('of:setBounds', rect)
  },

  // Print the active leaf via the OS print dialog.
  printContent: (html: string): void => {
    ipcRenderer.send('of:print', html)
  },

  // Optional: notify the renderer when the OS maximize state changes so it can
  // swap the maximize/restore glyph. Re-registering replaces any prior listener.
  onMaximizeChange: (cb: (maximized: boolean) => void): void => {
    ipcRenderer.removeAllListeners('of:maximized')
    ipcRenderer.on('of:maximized', (_e, maximized: boolean) => cb(maximized))
  },
}

contextBridge.exposeInMainWorld('openfall', openfall)
