// OpenFall — export/convert engine. Best-effort conversion of a leaf to a small
// set of formats (ARCHITECTURE → Export). Pure for text formats; PDF is produced
// by the platform layer from the HTML rendering (Electron printToPDF / browser print).
import type { Leaf } from '../types'

export type ExportFormat = 'txt' | 'md' | 'html' | 'pdf' | 'json' | 'rtf'

export interface ExportTarget {
  format: ExportFormat
  label: string
  ext: string
  mime: string
}

export const EXPORT_TARGETS: ExportTarget[] = [
  { format: 'txt', label: 'Plain text', ext: '.txt', mime: 'text/plain' },
  { format: 'md', label: 'Markdown', ext: '.md', mime: 'text/markdown' },
  { format: 'html', label: 'HTML', ext: '.html', mime: 'text/html' },
  { format: 'pdf', label: 'PDF', ext: '.pdf', mime: 'application/pdf' },
  { format: 'json', label: 'JSON', ext: '.json', mime: 'application/json' },
  { format: 'rtf', label: 'RTF', ext: '.rtf', mime: 'application/rtf' },
]

export interface ConvertResult {
  /** The converted text (for pdf, this is the HTML the platform should print). */
  text: string
  mime: string
  ext: string
  /** true when the platform must render+print this (PDF). */
  needsPrint: boolean
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A minimal, safe Markdown → HTML renderer (best-effort). */
export function markdownToHtml(src: string): string {
  const lines = src.split('\n')
  const out: string[] = []
  let inList = false
  let inCode = false

  const inline = (s: string): string => {
    let t = escapeHtml(s)
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    return t
  }

  for (const raw of lines) {
    if (/^```/.test(raw)) {
      if (inList) { out.push('</ul>'); inList = false }
      if (!inCode) { out.push('<pre><code>'); inCode = true } else { out.push('</code></pre>'); inCode = false }
      continue
    }
    if (inCode) { out.push(escapeHtml(raw)); continue }

    const h = raw.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      if (inList) { out.push('</ul>'); inList = false }
      const level = h[1].length
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      continue
    }
    const li = raw.match(/^\s*[-*+]\s+(.*)$/)
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${inline(li[1])}</li>`)
      continue
    }
    if (inList) { out.push('</ul>'); inList = false }
    if (raw.trim() === '') { out.push('') } else { out.push(`<p>${inline(raw)}</p>`) }
  }
  if (inList) out.push('</ul>')
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}

/** Wrap body HTML in a printable, self-styled document. */
export function htmlDocument(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Georgia, 'Newsreader', serif; max-width: 46rem; margin: 3rem auto; padding: 0 1.5rem;
         color: #1d1813; line-height: 1.7; }
  h1,h2,h3,h4,h5,h6 { font-family: 'IBM Plex Sans', system-ui, sans-serif; line-height: 1.25; }
  pre { background: #f3eee2; padding: 1rem; border-radius: 6px; overflow:auto; }
  code { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: .92em; }
  pre code { background: none; }
  a { color: #a06a1c; }
</style></head>
<body>
${bodyHtml}
</body></html>`
}

function toRtf(text: string): string {
  // Minimal RTF: escape backslashes/braces, map newlines to \par, unicode-escape non-ASCII.
  let body = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (ch === '\\' || ch === '{' || ch === '}') body += '\\' + ch
    else if (ch === '\n') body += '\\par\n'
    else if (ch === '\t') body += '\\tab '
    else if (code > 127) body += `\\u${code}?`
    else body += ch
  }
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Consolas;}}\\fs24\n${body}\n}`
}

/** Convert a leaf to the requested format. */
export function convertLeaf(leaf: Leaf, format: ExportFormat): ConvertResult {
  const t = EXPORT_TARGETS.find((x) => x.format === format) || EXPORT_TARGETS[0]
  const content = leaf.content || ''
  switch (format) {
    case 'txt':
    case 'md':
      return { text: content, mime: t.mime, ext: t.ext, needsPrint: false }
    case 'json':
      return {
        text: JSON.stringify(
          {
            name: leaf.name,
            content,
            meta: { category: leaf.category, created: leaf.created, id: leaf.id, exported: 'OpenFall' },
          },
          null,
          2,
        ),
        mime: t.mime,
        ext: t.ext,
        needsPrint: false,
      }
    case 'rtf':
      return { text: toRtf(content), mime: t.mime, ext: t.ext, needsPrint: false }
    case 'html':
      return { text: htmlDocument(leaf.name, markdownToHtml(content)), mime: t.mime, ext: t.ext, needsPrint: false }
    case 'pdf':
      // The platform renders this HTML to PDF (Electron printToPDF / browser print).
      return { text: htmlDocument(leaf.name, markdownToHtml(content)), mime: t.mime, ext: t.ext, needsPrint: true }
    default:
      return { text: content, mime: 'text/plain', ext: '.txt', needsPrint: false }
  }
}

/** A filesystem-safe slug for a leaf name (used as the suggested export filename). */
export function slugify(name: string): string {
  return (name || 'leaf')
    .trim()
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'leaf'
}
