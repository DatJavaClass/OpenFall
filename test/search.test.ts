import { describe, it, expect } from 'vitest'
import {
  buildSearchResults,
  compileQuery,
  summarize,
  toTerminalRows,
  sortLeaves,
} from '../src/lib/search'
import type { Leaf, SearchOptions } from '../src/types'

const mk = (over: Partial<Leaf> = {}): Leaf => ({
  id: 'id',
  side: 'left',
  name: 'note',
  custom: false,
  content: '',
  category: null,
  created: 0,
  ...over,
})
const opts = (o: Partial<SearchOptions> = {}): SearchOptions => ({
  matchCase: false,
  wholeWord: false,
  regex: false,
  ...o,
})

describe('buildSearchResults — empty / invalid query', () => {
  it('returns [] for an empty query', () => {
    expect(buildSearchResults([mk({ content: 'door' })], '')).toEqual([])
  })

  it('returns [] for a whitespace-only query', () => {
    expect(buildSearchResults([mk({ content: 'door' })], '   ')).toEqual([])
  })

  it('returns [] for an invalid regex', () => {
    expect(buildSearchResults([mk({ content: 'door' })], '(', opts({ regex: true }))).toEqual([])
  })
})

describe('buildSearchResults — case sensitivity', () => {
  const leaf = mk({ id: 'a', name: 'note', content: 'Door\ndoor\nDOOR' })

  it('is case-insensitive by default (matches all three lines)', () => {
    const r = buildSearchResults([leaf], 'door')
    expect(summarize(r)).toBe('3 matches · 1 leaf')
  })

  it('respects matchCase (only the lowercase line)', () => {
    const r = buildSearchResults([leaf], 'door', opts({ matchCase: true }))
    expect(summarize(r)).toBe('1 match · 1 leaf')
    expect(r[0].leaves[0].matches[0].line).toBe(2)
  })
})

describe('buildSearchResults — whole word', () => {
  const leaf = mk({ content: 'door\ndoorway\nthe door here' })

  it('matches substrings by default', () => {
    const r = buildSearchResults([leaf], 'door')
    expect(r[0].leaves[0].matches.map((m) => m.line)).toEqual([1, 2, 3])
  })

  it('excludes substrings when wholeWord is on', () => {
    const r = buildSearchResults([leaf], 'door', opts({ wholeWord: true }))
    // line 2 ("doorway") is excluded; lines 1 and 3 remain
    expect(r[0].leaves[0].matches.map((m) => m.line)).toEqual([1, 3])
  })
})

describe('buildSearchResults — regex mode', () => {
  it('treats the query as a regular expression', () => {
    const leaf = mk({ content: 'dor\ndoor\ndooor\ndr' })
    const r = buildSearchResults([leaf], 'do+r', opts({ regex: true }))
    // "dr" (no o) does not match
    expect(r[0].leaves[0].matches.map((m) => m.line)).toEqual([1, 2, 3])
  })

  it('escapes regex metacharacters when regex is off', () => {
    const r = buildSearchResults([mk({ content: 'a(b' })], '(')
    expect(r[0].leaves[0].matches[0].col).toBe(2)
  })
})

describe('compileQuery', () => {
  it('returns null for an invalid regex', () => {
    expect(compileQuery('(', opts({ regex: true }))).toBeNull()
  })

  it('wraps the pattern with \\b…\\b for wholeWord', () => {
    expect(compileQuery('door', opts({ wholeWord: true }))!.source).toBe('\\bdoor\\b')
  })

  it('uses gi flags by default and g when matchCase is on', () => {
    expect(compileQuery('x', opts())!.flags).toBe('gi')
    expect(compileQuery('x', opts({ matchCase: true }))!.flags).toBe('g')
  })

  it('escapes literal queries (non-regex)', () => {
    expect(compileQuery('a.b', opts())!.source).toBe('a\\.b')
  })
})

describe('buildSearchResults — truncation & 1-based positions', () => {
  it('truncates long before/after context and reports line/col 1-based', () => {
    const content = 'a'.repeat(35) + 'X' + 'b'.repeat(50)
    const r = buildSearchResults([mk({ content })], 'X')
    expect(r[0].leaves[0].matches[0]).toEqual({
      line: 1,
      col: 36,
      before: '…' + 'a'.repeat(30),
      hit: 'X',
      after: 'b'.repeat(42) + '…',
    })
  })

  it('leaves short context untruncated', () => {
    const m = buildSearchResults([mk({ content: 'pre X post' })], 'X')[0].leaves[0].matches[0]
    expect(m.before).toBe('pre ')
    expect(m.after).toBe(' post')
    expect(m.col).toBe(5)
  })

  it('records only the first match per line', () => {
    const r = buildSearchResults([mk({ content: 'door door' })], 'door')
    expect(r[0].leaves[0].matches).toHaveLength(1)
    expect(r[0].leaves[0].matches[0].col).toBe(1)
  })
})

describe('buildSearchResults — directory grouping', () => {
  const examined = [
    mk({ id: 'cat-code', category: 'Code', name: 'plain', content: 'door' }),
    mk({ id: 'cat-script', category: 'Script', name: 'plain', content: 'door' }),
    mk({ id: 'cat-examined', category: 'Examined', name: 'plain', content: 'door' }),
    mk({ id: 'ext-js', name: 'x.js', content: 'door' }),
    mk({ id: 'ext-json', name: 'x.json', content: 'door' }),
    mk({ id: 'ext-hexdump', name: 'x.hexdump', content: 'door' }),
  ]

  for (const leaf of examined) {
    it(`places "${leaf.id}" under ~/Journal/examined`, () => {
      expect(buildSearchResults([leaf], 'door')[0].dir).toBe('~/Journal/examined')
    })
  }

  it('places plain text leaves under ~/Journal/leaves', () => {
    const r = buildSearchResults([mk({ category: 'Text', name: 'note.txt', content: 'door' })], 'door')
    expect(r[0].dir).toBe('~/Journal/leaves')
  })

  it('orders the leaves directory before the examined directory', () => {
    const leavesLeaf = mk({ id: 'L', category: null, name: 'plain', content: 'door' })
    const examinedLeaf = mk({ id: 'E', category: 'Code', name: 'plain', content: 'door' })
    const r = buildSearchResults([examinedLeaf, leavesLeaf], 'door')
    expect(r.map((g) => g.dir)).toEqual(['~/Journal/leaves', '~/Journal/examined'])
  })
})

describe('summarize', () => {
  it('reports "no matches" for empty results', () => {
    expect(summarize([])).toBe('no matches')
  })

  it('uses singular nouns for 1 match / 1 leaf', () => {
    const r = buildSearchResults([mk({ content: 'door' })], 'door')
    expect(summarize(r)).toBe('1 match · 1 leaf')
  })

  it('uses plural nouns for many matches / leaves', () => {
    const r = buildSearchResults(
      [
        mk({ id: 'a', name: 'a', content: 'door\ndoor' }),
        mk({ id: 'b', name: 'b', content: 'door' }),
      ],
      'door',
    )
    expect(summarize(r)).toBe('3 matches · 2 leaves')
  })
})

describe('toTerminalRows', () => {
  it('flattens to rows with <dir>/<name> path, positions, and leafId', () => {
    const r = buildSearchResults([mk({ id: 'a', name: 'note', content: 'door\ndoor' })], 'door')
    const rows = toTerminalRows(r)
    expect(rows).toHaveLength(2)
    expect(rows[0].path).toBe('~/Journal/leaves/note')
    expect(rows[0].leafId).toBe('a')
    expect(rows[0].line).toBe(1)
    expect(rows[1].line).toBe(2)
  })
})

describe('sortLeaves — per-rail (left then right)', () => {
  const dateLeaves = [
    mk({ id: 'A', side: 'left', created: 100 }),
    mk({ id: 'B', side: 'left', created: 300 }),
    mk({ id: 'C', side: 'right', created: 200 }),
    mk({ id: 'D', side: 'right', created: 400 }),
  ]

  it('date: newest first within each rail by default', () => {
    expect(sortLeaves(dateLeaves, 'date').map((l) => l.id)).toEqual(['B', 'A', 'D', 'C'])
  })

  it('date asc: oldest first within each rail', () => {
    expect(sortLeaves(dateLeaves, 'date', 'asc').map((l) => l.id)).toEqual(['A', 'B', 'C', 'D'])
  })

  const alphaLeaves = [
    mk({ id: 'lM', side: 'left', name: 'mango' }),
    mk({ id: 'lA', side: 'left', name: 'apple' }),
    mk({ id: 'rC', side: 'right', name: 'cherry' }),
    mk({ id: 'rB', side: 'right', name: 'banana' }),
  ]

  it('alpha asc: A→Z within each rail', () => {
    expect(sortLeaves(alphaLeaves, 'alpha', 'asc').map((l) => l.id)).toEqual(['lA', 'lM', 'rB', 'rC'])
  })

  it('alpha desc: Z→A within each rail', () => {
    expect(sortLeaves(alphaLeaves, 'alpha', 'desc').map((l) => l.id)).toEqual(['lM', 'lA', 'rC', 'rB'])
  })

  it('alpha default (quick sort): natural A→Z within each rail', () => {
    expect(sortLeaves(alphaLeaves, 'alpha').map((l) => l.id)).toEqual(['lA', 'lM', 'rB', 'rC'])
  })

  it('keeps the two rails isolated (a left leaf precedes a right leaf even if it would sort later globally)', () => {
    const ids = sortLeaves(alphaLeaves, 'alpha', 'asc').map((l) => l.id)
    // "mango" (left) comes before "banana"/"cherry" (right) despite m > b, c
    expect(ids.indexOf('lM')).toBeLessThan(ids.indexOf('rB'))
  })

  const sizeLeaves = [
    mk({ id: 'l1', side: 'left', content: 'a' }),
    mk({ id: 'l3', side: 'left', content: 'aaa' }),
    mk({ id: 'r2', side: 'right', content: 'aa' }),
    mk({ id: 'r4', side: 'right', content: 'aaaa' }),
  ]

  it('size: largest first within each rail by default', () => {
    expect(sortLeaves(sizeLeaves, 'size').map((l) => l.id)).toEqual(['l3', 'l1', 'r4', 'r2'])
  })

  it('size asc: smallest first within each rail', () => {
    expect(sortLeaves(sizeLeaves, 'size', 'asc').map((l) => l.id)).toEqual(['l1', 'l3', 'r2', 'r4'])
  })

  const catLeaves = [
    mk({ id: 'lB', side: 'left', category: 'B' }),
    mk({ id: 'lA', side: 'left', category: 'A' }),
    mk({ id: 'rD', side: 'right', category: 'D' }),
    mk({ id: 'rC', side: 'right', category: 'C' }),
  ]

  it('category asc: category name ascending within each rail (no nulls)', () => {
    expect(sortLeaves(catLeaves, 'category', 'asc').map((l) => l.id)).toEqual(['lA', 'lB', 'rC', 'rD'])
  })

  it('category desc (the default direction): category name descending within each rail', () => {
    expect(sortLeaves(catLeaves, 'category', 'desc').map((l) => l.id)).toEqual(['lB', 'lA', 'rD', 'rC'])
  })

  // LEAD: possible bug — the `category` comparator uses '~~~' as a sentinel for a
  // null category, assuming code-point ordering where '~' (0x7E) sorts AFTER all
  // letters, so uncategorized leaves land last. But it compares via
  // String.prototype.localeCompare, which uses ICU collation where '~'
  // (punctuation) sorts BEFORE letters. Result: uncategorized (null) leaves sort
  // FIRST in ascending order, not LAST as the spec/comment ("uncategorized last")
  // requires. Observed in this repo's Node/ICU env:
  //   sortLeaves([{category:'B'},{category:null}], 'category', 'asc') => [null, 'B'].
  // Fix idea: don't rely on a string sentinel — compare null explicitly
  // (push nulls to the end) instead of mapping to '~~~'.
  // FIXED by the lead: comparator now handles null explicitly (nulls last in asc).
  it('category asc: uncategorized (null) sorts LAST [spec]', () => {
    const leaves = [
      mk({ id: 'B', side: 'left', category: 'B' }),
      mk({ id: 'N', side: 'left', category: null }),
    ]
    expect(sortLeaves(leaves, 'category', 'asc').map((l) => l.id)).toEqual(['B', 'N'])
  })
})
