// OpenFall — central command layer. Menus, toolbar buttons, and keyboard
// shortcuts all dispatch through here so behavior stays consistent.
import { useLeavesStore } from './state/leavesStore'
import { useSettingsStore } from './state/settingsStore'
import { useUiStore } from './state/uiStore'
import { useWindowsStore } from './state/windows'
import { saveNow } from './state/persist'
import { getAdapter } from './platform/adapter'
import { buildSearchResults } from './lib/search'
import { convertLeaf } from './lib/export'
import { searchUrl } from './lib/websearch'
import type { SearchMode, SortMode, ThemeChoice } from './types'

type ToggleKey = 'otherView' | 'showLineNumbers' | 'wrap' | 'spellcheck'
type EditCmd = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'

/** The leaf in the pane the user last clicked (primary or Other-View secondary),
 *  falling back to the active leaf. Used by Separate View and Categories. */
export function currentLeafId(): string | null {
  const { focusedLeafId } = useUiStore.getState()
  const { leaves, activeLeafId } = useLeavesStore.getState()
  if (focusedLeafId && leaves.some((l) => l.id === focusedLeafId)) return focusedLeafId
  return activeLeafId
}

export const cmd = {
  newLeaf() {
    useLeavesStore.getState().newLeaf()
    useUiStore.getState().closeMenus()
  },
  async openLeaf() {
    useUiStore.getState().closeMenus()
    const f = await getAdapter().openFile()
    if (f) useLeavesStore.getState().addLeaf(f.name, f.content)
  },
  async save() {
    await saveNow()
    useUiStore.getState().closeMenus()
  },
  closeActive() {
    const id = useLeavesStore.getState().activeLeafId
    if (id) useLeavesStore.getState().closeLeaf(id)
    useUiStore.getState().closeMenus()
  },
  openSearch(mode?: SearchMode) {
    useUiStore.getState().openSearch(mode)
  },
  exportDialog() {
    useUiStore.getState().openDialog('export')
  },
  /** Print the current leaf via the OS/browser print dialog. */
  print() {
    const leaf = useLeavesStore.getState().leaves.find((l) => l.id === currentLeafId())
    if (!leaf || leaf.url) return // web leaves use the webview's own print
    getAdapter().printContent(convertLeaf(leaf, 'pdf').text)
    useUiStore.getState().closeMenus()
  },
  /** Quick Search — open a web leaf showing results for the query. */
  webSearch(query: string) {
    const q = query.trim()
    if (!q) return
    const engine = useSettingsStore.getState().settings.searchEngine
    useLeavesStore.getState().addWebLeaf(`🔍 ${q}`, searchUrl(engine, q))
  },
  intervalDialog() {
    useUiStore.getState().openDialog('interval')
  },
  preferences() {
    useUiStore.getState().openDialog('prefs')
  },
  sortDialog() {
    useUiStore.getState().openDialog('sortadv')
    useUiStore.getState().closeToolMenu()
  },
  about() {
    useUiStore.getState().openDialog('about')
  },
  shortcuts() {
    useUiStore.getState().openDialog('shortcuts')
  },
  toggle(key: ToggleKey) {
    useSettingsStore.getState().toggle(key)
    useUiStore.getState().closeMenus()
  },
  setTheme(theme: ThemeChoice) {
    useSettingsStore.getState().setTheme(theme)
    useUiStore.getState().closeMenus()
  },
  zoom(delta: number) {
    useSettingsStore.getState().zoom(delta)
  },
  sortQuick(mode: SortMode) {
    useLeavesStore.getState().sortAll(mode)
  },
  /** Keyboard leaf navigation. up/down move within a rail; left/right jump rails. */
  navLeaf(dir: 'up' | 'down' | 'left' | 'right') {
    const held = new Set(
      useWindowsStore.getState().peers.filter((p) => p.separate && p.leafId).map((p) => p.leafId as string),
    )
    const all = useLeavesStore.getState().leaves.filter((l) => !held.has(l.id))
    const activeId = useLeavesStore.getState().activeLeafId
    const active = all.find((l) => l.id === activeId) ?? all[0]
    if (!active) return
    const pick = (leaf?: { id: string }) => {
      if (!leaf) return
      useLeavesStore.getState().selectLeaf(leaf.id)
      useUiStore.getState().setFocusedLeaf(leaf.id)
    }
    const sideLeaves = all.filter((l) => l.side === active.side)
    const idx = sideLeaves.findIndex((l) => l.id === active.id)
    if (dir === 'up') pick(sideLeaves[Math.max(0, idx - 1)])
    else if (dir === 'down') pick(sideLeaves[Math.min(sideLeaves.length - 1, idx + 1)])
    else {
      const targetSide = dir === 'left' ? 'left' : 'right'
      if (active.side === targetSide) return
      const target = all.filter((l) => l.side === targetSide)
      if (target.length) pick(target[Math.min(idx, target.length - 1)])
    }
  },
  exit() {
    getAdapter().windowControl('close')
  },
  /** Pop the focused leaf out into its own window (Separate View). */
  separateView() {
    const id = currentLeafId()
    if (id) getAdapter().separateWindow(id)
    useUiStore.getState().closeToolMenu()
  },
  edit(c: EditCmd) {
    useUiStore.getState().closeMenus()
    try {
      // Deprecated but universally supported for textarea editing commands.
      document.execCommand(c)
    } catch {
      /* no-op */
    }
  },
  /** Run a search over open leaves and show results in the given (or terminal) view. */
  runSearch(view?: 'terminal' | 'list') {
    const ui = useUiStore.getState()
    const results = buildSearchResults(useLeavesStore.getState().leaves, ui.searchQuery, ui.searchOpts)
    ui.showResults(results, view ?? ui.resultsView ?? 'terminal')
  },
}
