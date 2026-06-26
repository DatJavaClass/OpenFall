// OpenFall — Electron main process.
//
// Responsibilities:
//   1. Build the signature *frameless + transparent* rounded desktop window. The
//      bookmark "leaves" overhang a transparent margin, so real OS window
//      transparency is the whole point (backgroundColor '#00000000' on Windows).
//   2. Serve the built Vite renderer over a privileged `app://` scheme — this
//      avoids the file:// ESM/CORS problem that breaks <script type="module">.
//   3. Implement real-filesystem persistence + native dialogs behind the IPC
//      contract consumed by src/platform/electronAdapter.ts (via preload.ts).
//
// Note: the electron tsconfig has rootDir "." so we deliberately do NOT import
// from ../src (that trips TS6059 "not under rootDir"). We mirror only the
// structural shapes we need below; the renderer owns the authoritative types.

import { app, BrowserWindow, protocol, ipcMain, dialog, Menu } from 'electron'
import type { IpcMainInvokeEvent, IpcMainEvent } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

// ---------------------------------------------------------------------------
// Local, dependency-free mirrors of the renderer types (structural only).
// ---------------------------------------------------------------------------
type WindowAction = 'minimize' | 'maximize' | 'close'

interface ExportFileOpts {
  suggestedName: string // without extension
  ext: string // e.g. ".pdf"
  mime: string
  contents: string
  needsPrint: boolean // PDF: render `contents` (HTML) to PDF instead of writing verbatim
}
interface ExportFileResult {
  ok: boolean
  path?: string
  error?: string
}
interface LeafLike {
  id: string
  side?: string
  name?: string
  custom?: boolean
  content?: string
  category?: string | null
  created?: number
  url?: string
}
interface SnapshotLike {
  leaves?: LeafLike[]
  activeLeafId?: string | null
  categories?: unknown[]
  settings?: { autosaveLocation?: string } & Record<string, unknown>
}
/** One row of `.openfall/index.json` — leaf metadata + its on-disk filename. */
interface IndexEntry {
  id: string
  side: string
  name: string
  custom: boolean
  category: string | null
  created: number
  file: string
  url?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const APP_SCHEME = 'app'
const PLACEHOLDER_LOCATION = '~/Journal/leaves'
const META_DIR = '.openfall'

let distRoot = '' // absolute path to the built renderer (set on app ready)

// The privileged scheme MUST be registered before app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
])

// ---------------------------------------------------------------------------
// Renderer file server: app://local/<path> → <dist>/<path>
// ---------------------------------------------------------------------------
function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.woff2':
      return 'font/woff2'
    case '.woff':
      return 'font/woff'
    default:
      return 'application/octet-stream'
  }
}

function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    try {
      const root = path.normalize(distRoot)
      let rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
      if (rel === '') rel = 'index.html'
      const filePath = path.normalize(path.join(root, rel))
      // Block path traversal outside the dist root.
      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        const data = await fs.readFile(filePath)
        return new Response(data, { headers: { 'content-type': contentTypeFor(filePath) } })
      } catch {
        // Unknown path with no extension → SPA fallback to index.html.
        if (!path.extname(rel)) {
          const index = await fs.readFile(path.join(root, 'index.html'))
          return new Response(index, { headers: { 'content-type': 'text/html; charset=utf-8' } })
        }
        return new Response('Not found', { status: 404 })
      }
    } catch (err) {
      return new Response(String(err), { status: 500 })
    }
  })
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 680,
    minHeight: 460,
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    frame: false, // no native chrome — the renderer paints its own title bar
    transparent: true, // signature look: leaves overhang a transparent margin
    backgroundColor: '#00000000', // required for real transparency on Windows
    resizable: true,
    show: false, // reveal on ready-to-show to avoid a white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // Quick Search leaves embed a locked-down <webview>
    },
  })

  // The renderer's title bar uses `-webkit-app-region: drag`.
  win.once('ready-to-show', () => win.show())
  // Graceful fallback: some compositors delay ready-to-show for transparent
  // windows — make sure the app still becomes visible.
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }, 1500)

  // Surface maximize state for the optional onMaximizeChange bridge.
  win.on('maximize', () => win.webContents.send('of:maximized', true))
  win.on('unmaximize', () => win.webContents.send('of:maximized', false))

  const devURL = process.env.VITE_DEV_SERVER_URL
  if (devURL) {
    void win.loadURL(devURL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    void win.loadURL(`${APP_SCHEME}://local/index.html`)
  }
  return win
}

function appUrl(query = ''): string {
  const dev = process.env.VITE_DEV_SERVER_URL
  return dev ? dev + query : `${APP_SCHEME}://local/index.html${query}`
}

/** Separate View — a smaller window scoped to one leaf via ?separate=<id>. */
function createSeparateWindow(leafId: string): void {
  const win = new BrowserWindow({
    width: 640,
    height: 760,
    minWidth: 420,
    minHeight: 320,
    icon: path.join(app.getAppPath(), 'build', 'icon.png'),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // Quick Search leaves embed a locked-down <webview>
    },
  })
  win.once('ready-to-show', () => win.show())
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }, 1500)
  void win.loadURL(appUrl(`?separate=${encodeURIComponent(leafId)}`))
}

// ---------------------------------------------------------------------------
// Persistence (see docs/design/DATA_MODEL.md → "On-disk model")
// ---------------------------------------------------------------------------
function expandHome(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2))
  return p
}

function defaultJournalDir(): string {
  return path.join(app.getPath('documents'), 'OpenFall', 'Journal')
}

/**
 * Resolve settings.autosaveLocation → an absolute directory.
 *   - the shipped placeholder ("~/Journal/leaves"), empty, and a bare "~"
 *     map to the canonical default under Documents;
 *   - any other "~/…" path expands against $HOME;
 *   - absolute paths (what the directory picker returns) are used verbatim.
 */
function resolveAutosaveDir(location: string | undefined | null): string {
  const loc = (location ?? '').trim()
  if (!loc || loc === PLACEHOLDER_LOCATION || loc === '~') return defaultJournalDir()
  if (loc.startsWith('~')) return expandHome(loc)
  return loc
}

/**
 * Remembers the last autosave directory in userData. load() has no snapshot to
 * read settings.autosaveLocation from, so this pointer lets a custom location
 * survive a restart.
 */
function pointerFile(): string {
  return path.join(app.getPath('userData'), 'openfall-autosave.json')
}

async function readJsonSafe<T = unknown>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch {
    return null
  }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
}

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function uniqueFilename(leaf: LeafLike, used: Set<string>): string {
  const base = slugify(leaf.name ?? '') || slugify(leaf.id) || 'leaf'
  let candidate = `${base}.txt`
  let n = 2
  while (used.has(candidate)) candidate = `${base}-${n++}.txt`
  return candidate
}

async function saveSnapshot(raw: SnapshotLike): Promise<void> {
  const snapshot = raw ?? {}
  const leaves = Array.isArray(snapshot.leaves) ? snapshot.leaves : []
  const dir = resolveAutosaveDir(snapshot.settings?.autosaveLocation)
  const metaDir = path.join(dir, META_DIR)
  await fs.mkdir(metaDir, { recursive: true })

  // Prior index → stable filenames (avoid churn on rename) + the prune set.
  const prevIndex = (await readJsonSafe<IndexEntry[]>(path.join(metaDir, 'index.json'))) ?? []
  const prevById = new Map<string, string>()
  const prevFiles = new Set<string>()
  for (const e of prevIndex) {
    if (e && typeof e.id === 'string' && typeof e.file === 'string') {
      prevById.set(e.id, e.file)
      prevFiles.add(e.file)
    }
  }

  // Assign filenames in two passes so stable (reused) names always win, even if
  // a freshly-minted slug would otherwise collide with one.
  const used = new Set<string>()
  const fileByLeafId = new Map<string, string>()
  for (const leaf of leaves) {
    const prev = prevById.get(leaf.id)
    if (prev && !used.has(prev)) {
      used.add(prev)
      fileByLeafId.set(leaf.id, prev)
    }
  }
  for (const leaf of leaves) {
    if (fileByLeafId.has(leaf.id)) continue
    const f = uniqueFilename(leaf, used)
    used.add(f)
    fileByLeafId.set(leaf.id, f)
  }

  // Write each leaf's content to its own .txt file + build the index.
  const index: IndexEntry[] = []
  for (const leaf of leaves) {
    const file = fileByLeafId.get(leaf.id) as string
    await fs.writeFile(path.join(dir, file), leaf.content ?? '', 'utf8')
    index.push({
      id: leaf.id,
      side: leaf.side === 'right' ? 'right' : 'left',
      name: leaf.name ?? '',
      custom: !!leaf.custom,
      category: leaf.category ?? null,
      created: typeof leaf.created === 'number' ? leaf.created : Date.now(),
      file,
      url: leaf.url,
    })
  }

  await writeJson(path.join(metaDir, 'index.json'), index)
  await writeJson(path.join(metaDir, 'settings.json'), snapshot.settings ?? {})
  await writeJson(path.join(metaDir, 'categories.json'), snapshot.categories ?? [])
  await writeJson(path.join(metaDir, 'active.json'), { activeLeafId: snapshot.activeLeafId ?? null })

  // Prune OpenFall-managed leaf files (tracked by the previous index) that are
  // no longer present. We never touch files OpenFall did not write.
  for (const f of prevFiles) {
    if (!used.has(f)) await fs.rm(path.join(dir, f), { force: true }).catch(() => {})
  }

  // Remember where we saved, so load() can find a custom dir after restart.
  await writeJson(pointerFile(), { dir }).catch(() => {})
}

function defaultSettings(): SnapshotLike['settings'] {
  return {
    theme: 'dark',
    font: 'IBM Plex Mono',
    fontSize: 14,
    autosaveInterval: 30,
    autosaveLocation: PLACEHOLDER_LOCATION,
    otherView: false,
    showLineNumbers: true,
    wrap: true,
    spellcheck: true,
    fileAssoc: { '.txt': true, '.md': true, '.log': true, '.json': true, '.dat': false },
  }
}

async function loadSnapshot(): Promise<SnapshotLike | null> {
  try {
    const pointer = await readJsonSafe<{ dir?: string }>(pointerFile())
    const dir = pointer?.dir || defaultJournalDir()
    const metaDir = path.join(dir, META_DIR)
    const index = await readJsonSafe<IndexEntry[]>(path.join(metaDir, 'index.json'))
    if (!Array.isArray(index)) return null // first run / nothing persisted yet

    const settings = (await readJsonSafe(path.join(metaDir, 'settings.json'))) ?? defaultSettings()
    const categories = (await readJsonSafe(path.join(metaDir, 'categories.json'))) ?? []
    const active =
      (await readJsonSafe<{ activeLeafId?: string | null }>(path.join(metaDir, 'active.json'))) ?? {}

    const leaves: LeafLike[] = []
    for (const e of index) {
      if (!e || typeof e.id !== 'string') continue
      let content = ''
      try {
        content = await fs.readFile(path.join(dir, e.file), 'utf8')
      } catch {
        content = '' // file missing/unreadable — keep the leaf, lose its body
      }
      leaves.push({
        id: e.id,
        side: e.side === 'right' ? 'right' : 'left',
        name: e.name ?? '',
        custom: !!e.custom,
        content,
        category: e.category ?? null,
        created: typeof e.created === 'number' ? e.created : Date.now(),
        url: e.url,
      })
    }

    return {
      leaves,
      activeLeafId: active.activeLeafId ?? null,
      categories: Array.isArray(categories) ? categories : [],
      settings: settings as SnapshotLike['settings'],
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Native dialogs / export
// ---------------------------------------------------------------------------
function saveDialog(parent: BrowserWindow | null, options: Electron.SaveDialogOptions) {
  return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
}
function openDialog(parent: BrowserWindow | null, options: Electron.OpenDialogOptions) {
  return parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
}

async function exportFile(opts: ExportFileOpts, parent: BrowserWindow | null): Promise<ExportFileResult> {
  try {
    if (opts.needsPrint) {
      // Render the provided HTML in a hidden window, then print it to PDF. A
      // temp file (rather than a data: URL) avoids URL-length/encoding limits.
      const pdfWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      })
      const tmp = path.join(os.tmpdir(), `openfall-export-${Date.now()}.html`)
      try {
        await fs.writeFile(tmp, opts.contents, 'utf8')
        await pdfWin.loadFile(tmp) // resolves on did-finish-load
        const pdf = await pdfWin.webContents.printToPDF({ printBackground: true })
        const res = await saveDialog(parent, {
          defaultPath: `${opts.suggestedName}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        })
        if (res.canceled || !res.filePath) return { ok: false, error: 'cancelled' }
        await fs.writeFile(res.filePath, pdf)
        return { ok: true, path: res.filePath }
      } finally {
        await fs.rm(tmp, { force: true }).catch(() => {})
        if (!pdfWin.isDestroyed()) pdfWin.destroy()
      }
    }

    const ext = opts.ext.startsWith('.') ? opts.ext : `.${opts.ext}`
    const res = await saveDialog(parent, { defaultPath: `${opts.suggestedName}${ext}` })
    if (res.canceled || !res.filePath) return { ok: false, error: 'cancelled' }
    await fs.writeFile(res.filePath, opts.contents, 'utf8')
    return { ok: true, path: res.filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function chooseDirectory(parent: BrowserWindow | null): Promise<string | null> {
  try {
    const res = await openDialog(parent, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  } catch {
    return null
  }
}

async function openTextFile(
  parent: BrowserWindow | null,
): Promise<{ name: string; content: string } | null> {
  try {
    const res = await openDialog(parent, { properties: ['openFile'] })
    if (res.canceled || res.filePaths.length === 0) return null
    const p = res.filePaths[0]
    const content = await fs.readFile(p, 'utf8')
    return { name: path.basename(p), content }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// IPC wiring (mirrors src/platform/preload.ts channel names)
// ---------------------------------------------------------------------------
function senderWindow(e: IpcMainInvokeEvent | IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender)
}

function registerIpc(): void {
  ipcMain.handle('of:load', () => loadSnapshot())
  ipcMain.handle('of:save', async (_e, snapshot: SnapshotLike) => {
    // Best-effort like the web adapter: never reject the renderer's autosave —
    // a transient failure (locked dir, full disk) retries on the next tick.
    try {
      await saveSnapshot(snapshot)
    } catch (err) {
      console.error('[openfall] save failed:', err)
    }
  })
  ipcMain.handle('of:export', (e, opts: ExportFileOpts) => exportFile(opts, senderWindow(e)))
  ipcMain.handle('of:chooseDir', (e) => chooseDirectory(senderWindow(e)))
  ipcMain.handle('of:openFile', (e) => openTextFile(senderWindow(e)))
  ipcMain.on('of:separate', (_e, leafId: string) => createSeparateWindow(leafId))
  ipcMain.handle('of:getBounds', (e) => senderWindow(e)?.getBounds() ?? null)
  ipcMain.on('of:setBounds', (e, rect: { x: number; y: number; width: number; height: number }) => {
    const win = senderWindow(e)
    if (!win || !rect) return
    win.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.max(420, Math.round(rect.width)),
      height: Math.max(300, Math.round(rect.height)),
    })
  })
  ipcMain.on('of:print', async (_e, html: string) => {
    const w = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    })
    const tmp = path.join(os.tmpdir(), `openfall-print-${Date.now()}.html`)
    try {
      await fs.writeFile(tmp, html, 'utf8')
      await w.loadFile(tmp)
      await fs.rm(tmp, { force: true }).catch(() => {})
      w.webContents.print({}, () => {
        if (!w.isDestroyed()) w.destroy()
      })
    } catch {
      await fs.rm(tmp, { force: true }).catch(() => {})
      if (!w.isDestroyed()) w.destroy()
    }
  })
  ipcMain.on('of:winctl', (e, action: WindowAction) => {
    const win = senderWindow(e)
    if (!win) return
    if (action === 'minimize') {
      win.minimize()
    } else if (action === 'maximize') {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } else if (action === 'close') {
      win.close()
    }
  })
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  // Robust in both dev (`electron .` → project root) and packaged (app.asar).
  distRoot = path.join(app.getAppPath(), 'dist')
  Menu.setApplicationMenu(null) // no native menu bar
  registerAppProtocol()
  registerIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
