// OpenFall — transient UI state (never persisted): open menus, dialogs, the
// inline-rename target, search inputs/results, the autosave "Saved Ns" clock, etc.
import { create } from 'zustand'
import type {
  DialogName,
  PrefsSection,
  ResultsView,
  SearchGroup,
  SearchMode,
  SearchOptions,
  SortDirection,
  SortMode,
} from '../types'

interface CtxMenu {
  id: string
  x: number
  y: number
}

interface UiState {
  activeMenu: string | null
  dialog: DialogName
  searchMode: SearchMode
  prefsSection: PrefsSection
  renamingId: string | null
  toolMenu: 'join' | 'categories' | null
  ctxMenu: CtxMenu | null
  sortAdvMode: SortMode
  sortAdvDir: SortDirection
  resultsView: ResultsView
  searchQuery: string
  searchOpts: SearchOptions
  searchResults: SearchGroup[]
  otherLeafId: string | null
  /** The leaf in the pane the user last interacted with (primary or Other-View
   *  secondary) — what Separate View / Categories act on. */
  focusedLeafId: string | null
  lastSavedAt: number
  savedAgo: number

  toggleMenu(key: string): void
  closeMenus(): void
  openDialog(d: DialogName): void
  closeDialog(): void
  openSearch(mode?: SearchMode): void
  setSearchMode(m: SearchMode): void
  setPrefsSection(s: PrefsSection): void
  startRename(id: string): void
  stopRename(): void
  toggleToolMenu(m: 'join' | 'categories'): void
  closeToolMenu(): void
  openCtx(id: string, x: number, y: number): void
  closeCtx(): void
  setSortAdv(mode: SortMode, dir?: SortDirection): void
  setResultsView(v: ResultsView): void
  setSearchQuery(q: string): void
  setSearchOpts(o: Partial<SearchOptions>): void
  showResults(results: SearchGroup[], view: ResultsView): void
  setOtherLeaf(id: string | null): void
  setFocusedLeaf(id: string | null): void
  markSaved(at: number): void
  setSavedAgo(s: number): void
  /** Close click-dismissable popovers (menus, tool dropdowns, context menu) — not dialogs. */
  closeAllPopovers(): void
}

export const useUiStore = create<UiState>((set, get) => ({
  activeMenu: null,
  dialog: null,
  searchMode: 'search',
  prefsSection: 'appearance',
  renamingId: null,
  toolMenu: null,
  ctxMenu: null,
  sortAdvMode: 'date',
  sortAdvDir: 'desc',
  resultsView: null,
  searchQuery: '',
  searchOpts: { matchCase: false, wholeWord: false, regex: false },
  searchResults: [],
  otherLeafId: null,
  focusedLeafId: null,
  lastSavedAt: Date.now(),
  savedAgo: 0,

  toggleMenu: (key) =>
    set((st) => ({ activeMenu: st.activeMenu === key ? null : key, toolMenu: null, ctxMenu: null })),
  closeMenus: () => set({ activeMenu: null }),
  openDialog: (d) => set({ dialog: d, activeMenu: null, toolMenu: null, ctxMenu: null }),
  closeDialog: () => set({ dialog: null }),
  openSearch: (mode) =>
    set((st) => ({ dialog: 'search', searchMode: mode ?? st.searchMode, activeMenu: null, toolMenu: null })),
  setSearchMode: (m) => set({ searchMode: m }),
  setPrefsSection: (s) => set({ prefsSection: s }),
  startRename: (id) => set({ renamingId: id, activeMenu: null, ctxMenu: null }),
  stopRename: () => set({ renamingId: null }),
  toggleToolMenu: (m) => set((st) => ({ toolMenu: st.toolMenu === m ? null : m, activeMenu: null, ctxMenu: null })),
  closeToolMenu: () => set({ toolMenu: null }),
  openCtx: (id, x, y) => set({ ctxMenu: { id, x, y }, activeMenu: null, toolMenu: null }),
  closeCtx: () => set({ ctxMenu: null }),
  setSortAdv: (mode, dir) => set((st) => ({ sortAdvMode: mode, sortAdvDir: dir ?? st.sortAdvDir })),
  setResultsView: (v) => set({ resultsView: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpts: (o) => set((st) => ({ searchOpts: { ...st.searchOpts, ...o } })),
  showResults: (results, view) => set({ searchResults: results, resultsView: view, dialog: null }),
  setOtherLeaf: (id) => set({ otherLeafId: id }),
  setFocusedLeaf: (id) => set({ focusedLeafId: id }),
  markSaved: (at) => set({ lastSavedAt: at, savedAgo: 0 }),
  setSavedAgo: (s) => set({ savedAgo: s }),
  closeAllPopovers: () => {
    const st = get()
    if (st.activeMenu || st.toolMenu || st.ctxMenu) set({ activeMenu: null, toolMenu: null, ctxMenu: null })
  },
}))
