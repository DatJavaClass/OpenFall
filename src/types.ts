// OpenFall — shared TypeScript types. Mirror of the design handoff's state shape
// (docs/design/reference/state-shape.ts), extended for the real app.

export type Side = 'left' | 'right'
export type ThemeChoice = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'
export type ResultsView = 'terminal' | 'list' | null
export type SearchMode = 'search' | 'files' | 'replace' | 'remove' | 'add'
export type SortMode = 'date' | 'alpha' | 'size' | 'category'
export type SortDirection = 'asc' | 'desc'
export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo'
export type PrefsSection = 'appearance' | 'editor' | 'autosave' | 'files' | 'plugins'
export type DialogName =
  | 'prefs'
  | 'search'
  | 'export'
  | 'interval'
  | 'sortadv'
  | 'about'
  | 'shortcuts'
  | null

export interface Leaf {
  id: string
  side: Side
  name: string
  /** true once manually renamed → stops auto-naming */
  custom: boolean
  content: string
  category: string | null
  /** epoch ms — used for "sort by date" */
  created: number
  /** Set on a "web" leaf: the URL shown (read-only) by the Quick Search bar. */
  url?: string
}

export interface Category {
  name: string
  color: string // hex
}

export interface Settings {
  theme: ThemeChoice
  font: string // editor font family, default "IBM Plex Mono"
  fontSize: number // 11–22, default 14
  autosaveInterval: number // seconds: 10 | 30 | 60 | 300
  autosaveLocation: string // default "~/Journal/leaves"
  otherView: boolean
  showLineNumbers: boolean
  wrap: boolean
  spellcheck: boolean
  fileAssoc: Record<string, boolean>
  searchEngine: SearchEngine
}

export interface Kind {
  label: string
  mime: string
}

export interface SearchOptions {
  matchCase: boolean
  wholeWord: boolean
  regex: boolean
}

export interface SearchMatch {
  line: number
  col: number
  before: string
  hit: string
  after: string
}
export interface SearchLeaf {
  id: string
  name: string
  matches: SearchMatch[]
}
export interface SearchGroup {
  dir: string
  leaves: SearchLeaf[]
}

export interface TerminalRow {
  path: string
  line: number
  col: number
  before: string
  hit: string
  after: string
  leafId: string
}

/** The full set of values persisted across sessions (see DATA_MODEL.md). */
export interface PersistedSnapshot {
  leaves: Leaf[]
  activeLeafId: string | null
  categories: Category[]
  settings: Settings
}
