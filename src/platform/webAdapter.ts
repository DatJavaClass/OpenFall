// OpenFall — web/portable persistence: localStorage snapshot + File System Access
// API (with graceful fallbacks). This is the universal portable client backend.
import type { PlatformAdapter, ExportFileOpts, ExportFileResult, WindowAction, Rect } from './adapter'
import type { PersistedSnapshot } from '../types'

const KEY = 'openfall.state'

export class WebAdapter implements PlatformAdapter {
  readonly kind = 'web' as const

  async load(): Promise<PersistedSnapshot | null> {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      return JSON.parse(raw) as PersistedSnapshot
    } catch {
      return null
    }
  }

  async save(snapshot: PersistedSnapshot): Promise<void> {
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot))
    } catch {
      /* quota or private mode — best effort */
    }
  }

  async exportFile(opts: ExportFileOpts): Promise<ExportFileResult> {
    try {
      if (opts.needsPrint) {
        const w = window.open('', '_blank')
        if (!w) return { ok: false, error: 'popup blocked' }
        w.document.write(opts.contents)
        w.document.close()
        w.focus()
        setTimeout(() => w.print(), 300)
        return { ok: true }
      }
      const blob = new Blob([opts.contents], { type: opts.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = opts.suggestedName + opts.ext
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { ok: true, path: a.download }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async chooseDirectory(): Promise<string | null> {
    try {
      const picker = (window as unknown as { showDirectoryPicker?: () => Promise<{ name: string }> })
        .showDirectoryPicker
      if (picker) {
        const handle = await picker()
        return handle?.name ?? null
      }
    } catch {
      /* user cancelled or unsupported */
    }
    return null
  }

  async openFile(): Promise<{ name: string; content: string } | null> {
    type FsPicker = (o?: { multiple?: boolean }) => Promise<Array<{ getFile: () => Promise<File> }>>
    const picker = (window as unknown as { showOpenFilePicker?: FsPicker }).showOpenFilePicker
    if (picker) {
      try {
        const [h] = await picker({ multiple: false })
        const f = await h.getFile()
        return { name: f.name, content: await f.text() }
      } catch {
        return null
      }
    }
    // Fallback: hidden <input type=file>.
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.onchange = async () => {
        const f = input.files?.[0]
        if (!f) return resolve(null)
        resolve({ name: f.name, content: await f.text() })
      }
      // Some browsers fire no event on cancel; that's acceptable here.
      input.click()
    })
  }

  windowControl(action: WindowAction): void {
    // The main browser window can't self-close, but a Separate-View popup
    // (opened via window.open) can.
    if (action === 'close') window.close()
  }

  separateWindow(leafId: string): void {
    const url = location.pathname + '?separate=' + encodeURIComponent(leafId)
    window.open(url, '_blank', 'popup=yes,width=660,height=760')
  }

  async getBounds(): Promise<Rect | null> {
    return null
  }
  setBounds(_rect: Rect): void {
    /* the browser handles window resizing */
  }

  printContent(html: string): void {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }
}
