// OpenFall — toolbar: leaf/file actions, view toggles, categories, sort, spell,
// the Quick Search bar, and the always-saving status indicator.
import { useState } from 'react'
import { useSettingsStore } from '../state/settingsStore'
import { useUiStore } from '../state/uiStore'
import { useLeavesStore } from '../state/leavesStore'
import { useWindowsStore, sendLeafTo } from '../state/windows'
import { cmd, currentLeafId } from '../commands'
import { PALETTE } from '../lib/seed'

export function Toolbar() {
  const otherView = useSettingsStore((s) => s.settings.otherView)
  const spellcheck = useSettingsStore((s) => s.settings.spellcheck)
  const toolMenu = useUiStore((s) => s.toolMenu)
  const savedAgo = useUiStore((s) => s.savedAgo)
  const categories = useLeavesStore((s) => s.categories)
  const leaves = useLeavesStore((s) => s.leaves)
  const activeLeafId = useLeavesStore((s) => s.activeLeafId)
  const separatePeers = useWindowsStore((s) => s.peers).filter((p) => p.separate)

  const savedText = savedAgo <= 0 ? 'Saved' : `Saved ${savedAgo}s`
  const [webQuery, setWebQuery] = useState('')

  return (
    <div className="of-toolbar" onClick={(e) => e.stopPropagation()}>
      <button className="of-tb-btn" title="New leaf" onClick={cmd.newLeaf}>＋</button>
      <button className="of-tb-btn" title="Open" onClick={cmd.openLeaf}>＾</button>

      <span className="of-tb-sep" />
      <button className="of-tb-btn" title="Undo" onClick={() => cmd.edit('undo')}>↺</button>
      <button className="of-tb-btn" title="Redo" onClick={() => cmd.edit('redo')}>↻</button>

      <span className="of-tb-sep" />
      <button className="of-tb-btn" title="Find & Transform" onClick={() => cmd.openSearch('search')}>⌕</button>
      <button
        className={'of-tb-btn' + (otherView ? ' active' : '')}
        title="Enable Other View"
        onClick={() => useSettingsStore.getState().toggle('otherView')}
      >
        ▥
      </button>
      <button className="of-tb-btn" title="Separate View" onClick={cmd.separateView}>⧉</button>

      <button
        className="of-tb-btn"
        title="Join View"
        onClick={() => {
          useWindowsStore.getState().refresh()
          useUiStore.getState().toggleToolMenu('join')
        }}
      >
        ⤵▾
        {toolMenu === 'join' && (
          <div className="of-tb-dropdown" onClick={(e) => e.stopPropagation()}>
            {separatePeers.length === 0 ? (
              <div className="of-menu-item" style={{ color: 'var(--faint)', pointerEvents: 'none' }}>
                No other windows — use Separate View (⧉) first.
              </div>
            ) : (
              separatePeers.map((p) => (
                <div
                  key={p.id}
                  className="of-menu-item"
                  onClick={() => {
                    if (activeLeafId) sendLeafTo(p.id, activeLeafId)
                    useUiStore.getState().closeToolMenu()
                  }}
                >
                  <span className="label">Send current leaf → {p.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </button>

      <span className="of-tb-sep" />
      <button
        className="of-tb-btn"
        title="Categories"
        onClick={() => useUiStore.getState().toggleToolMenu('categories')}
      >
        <span className="of-swatch" /> Categories ▾
        {toolMenu === 'categories' && (
          <div className="of-tb-dropdown" onClick={(e) => e.stopPropagation()}>
            {categories.map((c) => {
              const curCat = leaves.find((l) => l.id === currentLeafId())?.category ?? null
              return (
                <div
                  key={c.name}
                  className="of-menu-item"
                  onClick={() => {
                    const id = currentLeafId()
                    if (id) useLeavesStore.getState().assignCategory(id, curCat === c.name ? null : c.name)
                    useUiStore.getState().closeToolMenu()
                  }}
                >
                  <span className="cat-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                  <span className="label">{c.name}</span>
                  {curCat === c.name && <span>✓</span>}
                </div>
              )
            })}
            <div className="of-menu-divider" />
            <div
              className="of-menu-item"
              onClick={() => {
                const color = PALETTE[categories.length % PALETTE.length]
                useLeavesStore.getState().addCategory(`Category ${categories.length + 1}`, color)
              }}
            >
              ＋ Add new…
            </div>
            <div className="of-menu-item" style={{ color: 'var(--faint)', pointerEvents: 'none' }}>
              Click to set the current leaf · right-click any leaf too.
            </div>
          </div>
        )}
      </button>

      <span className="of-tb-sep" />
      <button className="of-tb-btn" title="Sort Leaf…" onClick={cmd.sortDialog}>⇅ Sort</button>
      <button className="of-tb-btn" title="Sort by date" onClick={() => cmd.sortQuick('date')}>◷</button>
      <button className="of-tb-btn" title="Sort alphabetically" onClick={() => cmd.sortQuick('alpha')}>A↓</button>
      <button className="of-tb-btn" title="Sort by size" onClick={() => cmd.sortQuick('size')}>⊟</button>
      <button className="of-tb-btn" title="Sort by category" onClick={() => cmd.sortQuick('category')}>◧</button>

      <span className="of-tb-sep" />
      <button
        className={'of-tb-btn' + (spellcheck ? ' amber' : '')}
        title="Toggle spellcheck"
        onClick={() => useSettingsStore.getState().toggle('spellcheck')}
      >
        ✓ Spell
      </button>

      <span className="of-tb-spacer" />
      <input
        className="of-quicksearch"
        placeholder="⌕ Quick search…"
        title="Web Quick Search — opens results in a leaf"
        value={webQuery}
        onChange={(e) => setWebQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && webQuery.trim()) {
            cmd.webSearch(webQuery)
            setWebQuery('')
          }
        }}
      />
      <div className="of-save" title={`${leaves.length} leaves`}>
        <span className="of-save-dot" />
        {savedText}
      </div>
    </div>
  )
}
