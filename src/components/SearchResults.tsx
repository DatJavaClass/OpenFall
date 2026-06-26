// OpenFall — search results in two mutually-exclusive presentations sharing one
// `resultsView` value: Terminal (bottom console) and List (inner-side tree).
import { useState } from 'react'
import { useUiStore } from '../state/uiStore'
import { useLeavesStore } from '../state/leavesStore'
import { summarize, toTerminalRows } from '../lib/search'
import type { SearchMatch } from '../types'

function Toggle() {
  const view = useUiStore((s) => s.resultsView)
  const set = useUiStore((s) => s.setResultsView)
  return (
    <div className="of-results-toggle">
      <button className={view === 'terminal' ? 'on' : ''} onClick={() => set('terminal')}>Terminal</button>
      <button className={view === 'list' ? 'on' : ''} onClick={() => set('list')}>List</button>
    </div>
  )
}

function Hit({ m }: { m: SearchMatch }) {
  return (
    <>
      {m.before}
      <span className="of-hit">{m.hit}</span>
      {m.after}
    </>
  )
}

const jump = (leafId: string) => {
  useLeavesStore.getState().selectLeaf(leafId)
}

export function TerminalResults() {
  const results = useUiStore((s) => s.searchResults)
  const query = useUiStore((s) => s.searchQuery)
  const rows = toTerminalRows(results)
  const summary = summarize(results)
  return (
    <div className="of-terminal">
      <div className="of-terminal-head">
        <span>
          <span className="of-status-accent">openfall</span> · search
        </span>
        <span>"{query}" · {summary}</span>
        <span style={{ flex: 1 }} />
        <Toggle />
        <button className="of-dialog-x" onClick={() => useUiStore.getState().setResultsView(null)}>×</button>
      </div>
      <div className="of-terminal-body">
        <div style={{ color: 'var(--faint)' }}>$ openfall search "{query}" ~/Journal</div>
        {rows.map((r, i) => (
          <div key={i} className="of-term-row" onClick={() => jump(r.leafId)}>
            <span style={{ color: 'var(--muted)' }}>{r.path}</span>
            <span className="of-status-accent">:{r.line}:{r.col}</span>
            {'  '}
            {r.before}
            <span className="of-hit">{r.hit}</span>
            {r.after}
          </div>
        ))}
        <div style={{ color: 'var(--muted)' }}>
          {summary} <span style={{ color: 'var(--accent)' }}>▌</span>
        </div>
      </div>
    </div>
  )
}

export function ListResults() {
  const results = useUiStore((s) => s.searchResults)
  const summary = summarize(results)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))

  return (
    <div className="of-list">
      <div className="of-list-head">
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>Results</span>
        <span>{summary}</span>
        <span style={{ flex: 1 }} />
        <Toggle />
        <button className="of-dialog-x" onClick={() => useUiStore.getState().setResultsView(null)}>×</button>
      </div>
      <div className="of-list-body">
        {results.map((g) => {
          const dirKey = g.dir
          const dirCollapsed = collapsed[dirKey]
          return (
            <div key={dirKey}>
              <div className="of-list-dir" onClick={() => toggle(dirKey)}>
                {dirCollapsed ? '▸' : '▾'} {g.dir}
              </div>
              {!dirCollapsed &&
                g.leaves.map((lf) => {
                  const leafKey = dirKey + '/' + lf.id
                  const leafCollapsed = collapsed[leafKey]
                  return (
                    <div key={leafKey}>
                      <div className="of-list-leaf" onClick={() => toggle(leafKey)}>
                        <span>{leafCollapsed ? '▸' : '▾'}</span>
                        <span className="of-fileglyph" />
                        <span>{lf.name}</span>
                        <span className="of-list-count">{lf.matches.length}</span>
                      </div>
                      {!leafCollapsed &&
                        lf.matches.map((m, i) => (
                          <div key={i} className="of-list-match" onClick={() => jump(lf.id)}>
                            <span className="of-status-accent">{m.line}</span>  <Hit m={m} />
                          </div>
                        ))}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
