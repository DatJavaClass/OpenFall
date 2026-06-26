// OpenFall — Quick Search engines. The toolbar's quick-search bar opens a leaf
// that shows the results for one of these (a locked-down web view in the desktop
// app; a new browser tab in the portable/web client).
import type { SearchEngine } from '../types'

export const ENGINES: Array<{ id: SearchEngine; label: string; url: string }> = [
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q=' },
  { id: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'yahoo', label: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
]

export function searchUrl(engine: SearchEngine, query: string): string {
  const e = ENGINES.find((x) => x.id === engine) ?? ENGINES[0]
  return e.url + encodeURIComponent(query)
}
