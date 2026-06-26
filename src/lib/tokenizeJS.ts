// OpenFall — JS/TS syntax tokenizer for the read-only "code examiner".
// Pure, dependency-free. Ported from docs/design/reference/tokenizeJS.js.
// Whitespace/newlines are preserved in token text, so rendering tokens in a
// white-space:pre container reproduces the source exactly.

export type TokenKind =
  | 'keyword'
  | 'string'
  | 'number'
  | 'function'
  | 'literal'
  | 'comment'
  | 'property'
  | 'type'
  | 'punct'
  | 'ident'

export interface Token {
  text: string
  kind: TokenKind
  italic: boolean
}

/** kind → CSS custom property used by the editor's code view. */
export const TOKEN_VAR: Record<TokenKind, string> = {
  keyword: 'var(--tok-keyword)',
  string: 'var(--tok-string)',
  number: 'var(--tok-number)',
  function: 'var(--tok-function)',
  literal: 'var(--tok-literal)',
  comment: 'var(--tok-comment)',
  property: 'var(--tok-property)',
  type: 'var(--tok-type)',
  punct: 'var(--tok-punct)',
  ident: 'var(--tok-ident)',
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'class', 'new', 'import', 'export', 'from', 'as', 'await', 'async', 'typeof',
  'instanceof', 'of', 'in', 'switch', 'case', 'break', 'continue', 'default',
  'try', 'catch', 'finally', 'throw', 'this', 'extends', 'super', 'yield',
  'delete', 'void',
])
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])

export function tokenizeJS(code: string): Token[] {
  const toks: Token[] = []
  let i = 0
  const n = code.length
  const push = (text: string, kind: TokenKind, italic = false) => toks.push({ text, kind, italic })

  while (i < n) {
    const c = code[i]

    // line comment
    if (c === '/' && code[i + 1] === '/') {
      let j = code.indexOf('\n', i)
      if (j < 0) j = n
      push(code.slice(i, j), 'comment', true)
      i = j
      continue
    }
    // block comment
    if (c === '/' && code[i + 1] === '*') {
      let j = code.indexOf('*/', i)
      j = j < 0 ? n : j + 2
      push(code.slice(i, j), 'comment', true)
      i = j
      continue
    }
    // string / template (template ${} treated as part of the string for simplicity)
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < n && code[j] !== c) {
        if (code[j] === '\\') j++
        j++
      }
      j = Math.min(j + 1, n)
      push(code.slice(i, j), 'string')
      i = j
      continue
    }
    // number
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < n && /[0-9._xa-fA-F]/.test(code[j])) j++
      push(code.slice(i, j), 'number')
      i = j
      continue
    }
    // identifier / keyword / function-call / property / Type
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++
      const w = code.slice(i, j)
      let k = j
      while (k < n && code[k] === ' ') k++ // peek next non-space
      let kind: TokenKind = 'ident'
      if (KEYWORDS.has(w)) kind = 'keyword'
      else if (LITERALS.has(w)) kind = 'literal'
      else if (code[k] === '(') kind = 'function'
      else if (code[i - 1] === '.') kind = 'property'
      else if (/^[A-Z]/.test(w)) kind = 'type'
      push(w, kind)
      i = j
      continue
    }
    // anything else = punctuation/whitespace
    push(c, 'punct')
    i++
  }
  return toks
}
