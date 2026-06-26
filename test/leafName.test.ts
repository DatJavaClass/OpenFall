import { describe, it, expect } from 'vitest'
import { deriveLeafName, kindOf, isCodeLeaf, nextSide } from '../src/lib/leafName'
import type { Leaf, Side } from '../src/types'

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

describe('deriveLeafName', () => {
  it('uses the first non-empty line, skipping leading blank lines, trimmed', () => {
    expect(deriveLeafName('\n\n   Hello world  \nsecond line')).toBe('Hello world')
  })

  it('keeps only the first 5 whitespace-separated words', () => {
    expect(deriveLeafName('one two three four five six seven')).toBe('one two three four five')
  })

  it('collapses arbitrary inter-word whitespace to single spaces', () => {
    expect(deriveLeafName('alpha\tbeta   gamma')).toBe('alpha beta gamma')
  })

  it('truncates a long single word to 26 chars + ellipsis', () => {
    const input = 'supercalifragilisticexpialidocious' // 34 chars, no spaces
    const out = deriveLeafName(input)
    expect(out).toBe(input.slice(0, 26) + '…')
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBe(27)
  })

  it('truncates a long 5-word phrase to 26 chars + ellipsis', () => {
    // first 5 words = "Lorem ipsum dolor sit amett" (27 chars) -> slice(0,26)+…
    expect(deriveLeafName('Lorem ipsum dolor sit amett extra words')).toBe('Lorem ipsum dolor sit amet…')
  })

  it('does not truncate a phrase of exactly 26 chars', () => {
    const s = 'Lorem ipsum dolor sit amet' // exactly 26 chars
    expect(s.length).toBe(26)
    expect(deriveLeafName(s)).toBe(s)
  })

  it('returns "Untitled leaf" for an empty string', () => {
    expect(deriveLeafName('')).toBe('Untitled leaf')
  })

  it('returns "Untitled leaf" for whitespace-only input', () => {
    expect(deriveLeafName('   \n\t\n  ')).toBe('Untitled leaf')
  })
})

describe('kindOf', () => {
  it('detects all JavaScript/TypeScript extensions', () => {
    for (const n of ['a.js', 'a.jsx', 'a.ts', 'a.mjs', 'a.cjs']) {
      expect(kindOf(n)).toEqual({ label: 'JavaScript', mime: 'examined code' })
    }
  })

  it('is case-insensitive for JS', () => {
    expect(kindOf('SCRATCH.JS')).toEqual({ label: 'JavaScript', mime: 'examined code' })
  })

  it('detects JSON', () => {
    expect(kindOf('data.json')).toEqual({ label: 'JSON', mime: 'application/json' })
  })

  it('detects .hexdump and any name containing "hex"', () => {
    expect(kindOf('Fyldere.hexdump')).toEqual({ label: 'Hex view', mime: 'examined binary' })
    expect(kindOf('myhexfile')).toEqual({ label: 'Hex view', mime: 'examined binary' })
    expect(kindOf('FILE.HEXDUMP')).toEqual({ label: 'Hex view', mime: 'examined binary' })
  })

  it('detects Markdown', () => {
    expect(kindOf('README.md')).toEqual({ label: 'Markdown', mime: 'text/markdown' })
  })

  it('detects Log', () => {
    expect(kindOf('out.log')).toEqual({ label: 'Log', mime: 'text/plain' })
  })

  it('detects Plain text', () => {
    expect(kindOf('notes.txt')).toEqual({ label: 'Plain text', mime: 'text/plain' })
  })

  it('falls back to "Journal leaf" for unknown / empty names', () => {
    expect(kindOf('untitled')).toEqual({ label: 'Journal leaf', mime: 'text/plain' })
    expect(kindOf('mystery.dat')).toEqual({ label: 'Journal leaf', mime: 'text/plain' })
    expect(kindOf('')).toEqual({ label: 'Journal leaf', mime: 'text/plain' })
  })
})

describe('isCodeLeaf', () => {
  it('is true for JS/TS extensions (case-insensitive)', () => {
    for (const n of ['a.js', 'a.jsx', 'a.ts', 'a.mjs', 'a.cjs', 'A.JS', 'b.Ts']) {
      expect(isCodeLeaf(n)).toBe(true)
    }
  })

  it('is false for non-code names (incl. .json, .tsx, no extension)', () => {
    for (const n of ['a.json', 'a.md', 'a.txt', 'a.tsx', 'plain', 'typescript', '']) {
      expect(isCodeLeaf(n)).toBe(false)
    }
  })
})

describe('nextSide', () => {
  const L = (n: number) => Array.from({ length: n }, () => mk({ side: 'left' as Side }))
  const R = (n: number) => Array.from({ length: n }, () => mk({ side: 'right' as Side }))

  it('returns left for an empty list (0–0 tie)', () => {
    expect(nextSide([])).toBe('left')
  })

  it('returns left on a tie', () => {
    expect(nextSide([...L(2), ...R(2)])).toBe('left')
  })

  it('returns right when the left rail has more', () => {
    expect(nextSide([...L(3), ...R(1)])).toBe('right')
  })

  it('returns left when the right rail has more', () => {
    expect(nextSide([...L(1), ...R(3)])).toBe('left')
  })
})
