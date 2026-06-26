// OpenFall — leaf auto-naming + file-kind detection. Pure, dependency-free.
// Ported from docs/design/reference/auto-name.js.
import type { Leaf, Kind, Side } from '../types'

/**
 * While a leaf has not been manually renamed (custom === false), its display
 * name is derived from its content on every edit:
 *  - first non-empty line, trimmed
 *  - its first 5 whitespace-separated words
 *  - truncated to 26 chars + "…" if longer; "Untitled leaf" if empty.
 */
export function deriveLeafName(text: string): string {
  const firstLine = (text.split('\n').find((l) => l.trim().length) || '').trim()
  if (!firstLine) return 'Untitled leaf'
  const words = firstLine.split(/\s+/).slice(0, 5).join(' ')
  return words.length > 26 ? words.slice(0, 26).trim() + '…' : words
}

/** Status-bar kind label + pane-header "MIME"; also gates the code examiner. */
export function kindOf(name: string): Kind {
  const n = (name || '').toLowerCase()
  if (/\.(js|jsx|ts|mjs|cjs)$/.test(n)) return { label: 'JavaScript', mime: 'examined code' }
  if (n.endsWith('.json')) return { label: 'JSON', mime: 'application/json' }
  if (n.endsWith('.hexdump') || n.includes('hex')) return { label: 'Hex view', mime: 'examined binary' }
  if (n.endsWith('.md')) return { label: 'Markdown', mime: 'text/markdown' }
  if (n.endsWith('.log')) return { label: 'Log', mime: 'text/plain' }
  if (n.endsWith('.txt')) return { label: 'Plain text', mime: 'text/plain' }
  return { label: 'Journal leaf', mime: 'text/plain' }
}

/** A leaf renders in the read-only code examiner when its name is JS/TS. */
export const isCodeLeaf = (name: string): boolean => /\.(js|jsx|ts|mjs|cjs)$/i.test(name || '')

/**
 * Heuristic: does this leaf's *content* look like source code (so a plain note
 * should switch to live syntax highlighting even without a code extension)?
 * Conservative — requires several strong signals so ordinary prose never trips it.
 */
export function looksLikeCode(text: string): boolean {
  const t = text || ''
  if (t.trim().length < 12) return false
  const lines = t.split('\n').filter((l) => l.trim())
  let score = 0
  // code keywords anywhere (lowercase — prose tends to capitalise)
  if (/\b(function|const|let|var|class|return|import|export|def|func|public|private|static|void|struct|enum|include|namespace|package)\b/.test(t)) score++
  // a line ends in ; { }
  if (/[;{}]\s*$/m.test(t)) score++
  // lines that START with a control word or type — case-sensitive, so prose's
  // capitalised "If"/"For" don't count; covers brace-less scripts (import/int/for…)
  const codeStart =
    /^[ \t]*(if|else|elif|for|foreach|while|switch|case|do|try|catch|return|import|export|from|public|private|protected|static|void|int|long|short|float|double|string|str|bool|boolean|char|byte|var|let|const|class|def|func|fn|struct|enum)\b/
  if (lines.filter((l) => codeStart.test(l)).length >= 1) score++
  // call/def or member call
  if (/\w+\s*\([^)]*\)\s*[{;]|\w+\.\w+\s*\(/.test(t)) score++
  // operators rare in prose
  if (/=>|->|===|!==|\+\+|--|&&|\|\||::|\+=|-=/.test(t)) score++
  // symbol density
  const punct = (t.match(/[{}();=<>]/g) || []).length
  if (punct / t.length > 0.04) score++
  // ≥2 independent signals — catches structured code AND brace-less scripts, while
  // ordinary prose rarely trips two (a code keyword + a lowercase code line-start).
  return score >= 2
}

/** Which rail a new leaf opens on: the side with fewer leaves (ties → left). */
export function nextSide(leaves: Leaf[]): Side {
  const left = leaves.filter((t) => t.side === 'left').length
  const right = leaves.filter((t) => t.side === 'right').length
  return left <= right ? 'left' : 'right'
}
