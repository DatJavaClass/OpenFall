// OpenFall — search results builder + sort comparators. Pure, dependency-free.
// Ported from docs/design/reference/build-search-results.js and extended to
// honor Match-case / Whole-word / Regex options (BEHAVIOR_SPEC → Search).
import type {
  Leaf,
  SearchGroup,
  SearchOptions,
  SortMode,
  SortDirection,
  TerminalRow,
} from '../types'

const EXAMINED_CATS = ['Code', 'Script', 'Examined']
const DEFAULT_OPTS: SearchOptions = { matchCase: false, wholeWord: false, regex: false }

function dirOf(leaf: Leaf): string {
  const examined =
    (leaf.category != null && EXAMINED_CATS.includes(leaf.category)) ||
    /\.(js|json|hexdump)$/i.test(leaf.name)
  return examined ? '~/Journal/examined' : '~/Journal/leaves'
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compile the query+options into a RegExp, or return null on invalid regex.
 * (Literal queries are escaped; whole-word wraps with \b…\b.)
 */
export function compileQuery(query: string, opts: SearchOptions): RegExp | null {
  let pattern = opts.regex ? query : escapeRegExp(query)
  if (opts.wholeWord) pattern = `\\b${pattern}\\b`
  const flags = opts.matchCase ? 'g' : 'gi'
  try {
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
}

/**
 * Scan every leaf's content for the query. For each matching line, record the
 * first match {line, col, before, hit, after}, grouped directory → leaf → line.
 * Returns [] for an empty query or an invalid regex.
 */
export function buildSearchResults(
  leaves: Leaf[],
  query: string,
  opts: SearchOptions = DEFAULT_OPTS,
): SearchGroup[] {
  const q = (query || '').trim()
  if (!q) return []
  const re = compileQuery(q, opts)
  if (!re) return []

  const order = ['~/Journal/leaves', '~/Journal/examined']
  const groups: Record<string, SearchGroup['leaves']> = {}

  for (const leaf of leaves) {
    const lines = (leaf.content || '').split('\n')
    const matches = []
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]
      re.lastIndex = 0
      const m = re.exec(ln)
      if (m && m[0].length > 0) {
        const idx = m.index
        const hitLen = m[0].length
        let before = ln.slice(0, idx)
        const hit = ln.slice(idx, idx + hitLen)
        let after = ln.slice(idx + hitLen)
        if (before.length > 30) before = '…' + before.slice(-30)
        if (after.length > 42) after = after.slice(0, 42) + '…'
        matches.push({ line: i + 1, col: idx + 1, before, hit, after })
      }
    }
    if (matches.length) {
      const d = dirOf(leaf)
      ;(groups[d] = groups[d] || []).push({ id: leaf.id, name: leaf.name, matches })
    }
  }
  return order.filter((d) => groups[d]).map((d) => ({ dir: d, leaves: groups[d] }))
}

export function summarize(results: SearchGroup[]): string {
  let matchCount = 0
  let leafCount = 0
  results.forEach((g) =>
    g.leaves.forEach((l) => {
      leafCount++
      matchCount += l.matches.length
    }),
  )
  if (matchCount === 0) return 'no matches'
  return `${matchCount} ${matchCount === 1 ? 'match' : 'matches'} · ${leafCount} ${
    leafCount === 1 ? 'leaf' : 'leaves'
  }`
}

/** Flatten to terminal rows: "<dir>/<name>:<line>:<col>  <before><hit><after>". */
export function toTerminalRows(results: SearchGroup[]): TerminalRow[] {
  const rows: TerminalRow[] = []
  results.forEach((g) =>
    g.leaves.forEach((l) =>
      l.matches.forEach((m) =>
        rows.push({
          path: `${g.dir}/${l.name}`,
          line: m.line,
          col: m.col,
          before: m.before,
          hit: m.hit,
          after: m.after,
          leafId: l.id,
        }),
      ),
    ),
  )
  return rows
}

// ---- Sort comparators (applied within each rail independently) ----
type Cmp = (a: Leaf, b: Leaf) => number
export const sortComparators: Record<SortMode, Cmp> = {
  date: (a, b) => (b.created || 0) - (a.created || 0), // newest first
  alpha: (a, b) => a.name.localeCompare(b.name),
  size: (a, b) => (b.content || '').length - (a.content || '').length, // largest first
  // uncategorized (null) sorts LAST in natural order. Handle null explicitly —
  // a string sentinel + localeCompare is unsafe (ICU collation orders '~' before
  // letters, which would float nulls to the top).
  category: (a, b) => {
    if (a.category == null && b.category == null) return 0
    if (a.category == null) return 1
    if (b.category == null) return -1
    return a.category.localeCompare(b.category)
  },
}

/**
 * Sort leaves within each rail. With NO `direction` (the quick-sort toolbar
 * buttons) each mode uses its NATURAL order: date=newest-first, alpha=A→Z,
 * size=largest-first, category=A→Z (uncategorized last). The advanced Sort
 * dialog passes an explicit 'asc'/'desc' to override.
 */
export function sortLeaves(leaves: Leaf[], mode: SortMode, direction?: SortDirection): Leaf[] {
  const base = sortComparators[mode] || sortComparators.date
  let cmp: Cmp = base
  if (direction) {
    // base orders are: date desc, alpha asc, size desc, category asc.
    const naturalDesc = mode === 'date' || mode === 'size'
    const flip = (naturalDesc && direction === 'asc') || (!naturalDesc && direction === 'desc')
    if (flip) cmp = (a, b) => -base(a, b)
  }
  const left = leaves.filter((t) => t.side === 'left').sort(cmp)
  const right = leaves.filter((t) => t.side === 'right').sort(cmp)
  return [...left, ...right]
}
