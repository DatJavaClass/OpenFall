import { describe, it, expect } from 'vitest'
import { tokenizeJS } from '../src/lib/tokenizeJS'
import { SEED_LEAVES } from '../src/lib/seed'

const roundTrip = (code: string) => tokenizeJS(code).map((t) => t.text).join('')
const firstKind = (code: string, text: string) =>
  tokenizeJS(code).find((t) => t.text === text)?.kind

describe('tokenizeJS — round-trip preserves source exactly', () => {
  it('reproduces a multi-line snippet character-for-character', () => {
    const code = "const x = 1\n// note\nfunction f(a) {\n  return a + 2\n}\n"
    expect(roundTrip(code)).toBe(code)
  })

  it('reproduces the seed scratch.js content exactly', () => {
    const scratch = SEED_LEAVES.find((l) => l.name === 'scratch.js')!
    expect(roundTrip(scratch.content)).toBe(scratch.content)
  })

  it('reproduces the empty string', () => {
    expect(roundTrip('')).toBe('')
  })

  it('reproduces input with an unterminated string without crashing', () => {
    const code = "const s = 'abc"
    expect(roundTrip(code)).toBe(code)
  })

  it('reproduces input with an unterminated block comment', () => {
    const code = 'x /* open'
    expect(roundTrip(code)).toBe(code)
  })
})

describe('tokenizeJS — token kinds', () => {
  it('marks keywords', () => {
    expect(firstKind('const x = 1', 'const')).toBe('keyword')
  })

  it('marks strings including their quotes', () => {
    expect(firstKind("const s = 'x'", "'x'")).toBe('string')
  })

  it('marks numbers', () => {
    expect(firstKind('const n = 42', '42')).toBe('number')
  })

  it('marks true/null (and friends) as literals', () => {
    expect(firstKind('[true, null]', 'true')).toBe('literal')
    expect(firstKind('[true, null]', 'null')).toBe('literal')
  })

  it('marks a line comment as comment with italic:true', () => {
    const c = tokenizeJS('// hello\n').find((t) => t.text === '// hello')
    expect(c?.kind).toBe('comment')
    expect(c?.italic).toBe(true)
  })

  it('marks a block comment as comment with italic:true', () => {
    const c = tokenizeJS('/* block */').find((t) => t.kind === 'comment')
    expect(c?.text).toBe('/* block */')
    expect(c?.italic).toBe(true)
  })

  it('marks an identifier directly before "(" as a function call', () => {
    expect(firstKind('foo()', 'foo')).toBe('function')
  })

  it('marks an identifier directly after "." as a property', () => {
    expect(firstKind('a.bar', 'bar')).toBe('property')
  })

  it('marks a Capitalized identifier as a type', () => {
    expect(firstKind('class Hallway {', 'Hallway')).toBe('type')
  })

  it('marks a lowercase plain identifier as ident', () => {
    expect(firstKind('let foo', 'foo')).toBe('ident')
  })

  it('keeps non-comment tokens non-italic', () => {
    const toks = tokenizeJS('const x = 1')
    expect(toks.every((t) => t.kind === 'comment' || t.italic === false)).toBe(true)
  })
})
