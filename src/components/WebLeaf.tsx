// OpenFall — a "web" leaf (from the Quick Search bar). In the desktop app it hosts
// a locked-down Electron <webview> (no address bar, no back/forward — it is what it
// says it is). In the portable/web client, search engines block embedding, so it
// opens the results in a new browser tab instead.
import { createElement, useEffect } from 'react'
import { isElectron } from '../platform/adapter'
import { useUiStore } from '../state/uiStore'
import type { Leaf } from '../types'

export function WebLeaf({ leaf, isOther = false }: { leaf: Leaf; isOther?: boolean }) {
  const url = leaf.url || ''
  let host = url
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    /* leave as-is */
  }
  const electron = isElectron()

  useEffect(() => {
    if (!electron && url) window.open(url, '_blank', 'noopener')
  }, [url, electron])

  return (
    <div className="of-pane" onMouseDown={() => useUiStore.getState().setFocusedLeaf(leaf.id)}>
      <div className="of-pane-header">
        <span
          className="of-pane-dot"
          style={isOther ? { background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}
        />
        {isOther && <span style={{ color: 'var(--muted)' }}>Other View ·</span>}
        <span style={{ color: 'var(--text)' }}>{leaf.name}</span>
        <span className="of-pane-kind">· web · {host}</span>
      </div>
      <div className="of-pane-body of-web-body">
        {electron
          ? createElement('webview', {
              src: url,
              className: 'of-webview',
              partition: 'persist:quicksearch',
            })
          : (
            <div className="of-web-fallback">
              <div>
                Quick Search opened <strong>{host}</strong> in your browser.
              </div>
              <div className="of-hint">Embedded results aren't available in the portable build.</div>
              <button className="of-btn primary" onClick={() => window.open(url, '_blank', 'noopener')}>
                Open results ↗
              </button>
            </div>
          )}
      </div>
    </div>
  )
}
