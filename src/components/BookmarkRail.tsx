// OpenFall — the signature: angled bookmark "leaves" in two rails that overhang
// the transparent window margin. −7° tilt pivoting on the inner edge; the active
// leaf is wider/brighter with an accent inner border and bigger shadow.
import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { useLeavesStore } from '../state/leavesStore'
import { useUiStore } from '../state/uiStore'
import { useWindowsStore } from '../state/windows'
import type { Leaf, Side } from '../types'

const ROT = -7

export function BookmarkRail({ side }: { side: Side }) {
  // Leaves currently moved out into a Separate-View window are hidden from the
  // main rails (they live in that window now) — no duplicates.
  const peers = useWindowsStore((s) => s.peers)
  const held = new Set(peers.filter((p) => p.separate && p.leafId).map((p) => p.leafId as string))
  // Select the stable `leaves` reference and filter in render — selecting a
  // freshly-filtered array would return a new snapshot each render (Zustand v5
  // useSyncExternalStore → infinite loop).
  const leaves = useLeavesStore((s) => s.leaves).filter((l) => l.side === side && !held.has(l.id))
  return (
    <div className={'of-rail ' + side}>
      {leaves.map((leaf) => (
        <BookmarkLeaf key={leaf.id} leaf={leaf} side={side} />
      ))}
    </div>
  )
}

function BookmarkLeaf({ leaf, side }: { leaf: Leaf; side: Side }) {
  const activeId = useLeavesStore((s) => s.activeLeafId)
  const categories = useLeavesStore((s) => s.categories)
  const renamingId = useUiStore((s) => s.renamingId)
  const inputRef = useRef<HTMLInputElement>(null)

  const active = leaf.id === activeId
  const renaming = renamingId === leaf.id
  const catColor = leaf.category ? categories.find((c) => c.name === leaf.category)?.color : null

  const wrapStyle: CSSProperties = {
    transform: `rotate(${ROT}deg)`,
    transformOrigin: side === 'left' ? 'right center' : 'left center',
    transition: 'transform .18s ease',
    zIndex: active ? 3 : 1,
    justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
  }
  const accentBorder = active ? '3px solid var(--accent)' : '3px solid transparent'
  const bodyStyle: CSSProperties = {
    width: active ? 'calc(var(--rail-w) + 16px)' : 'var(--rail-w)',
    justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
    padding: side === 'left' ? '8px 11px 8px 13px' : '8px 13px 8px 11px',
    background: active ? 'var(--tab-active)' : 'var(--tab)',
    color: active ? 'var(--text)' : 'var(--muted)',
    [side === 'left' ? 'borderRight' : 'borderLeft']: accentBorder,
    borderRadius: side === 'left' ? '0 10px 10px 0' : '10px 0 0 10px',
    boxShadow: active ? '0 6px 20px var(--shadow)' : '0 2px 6px rgba(0,0,0,0.2)',
    fontWeight: active ? 500 : 400,
  }

  const commit = (value: string) => {
    useLeavesStore.getState().renameLeaf(leaf.id, value)
    useUiStore.getState().stopRename()
  }

  return (
    <div className="of-leaf-wrap" style={wrapStyle}>
      <div
        className="of-leaf"
        style={bodyStyle}
        onClick={(e) => {
          e.stopPropagation()
          useLeavesStore.getState().selectLeaf(leaf.id)
          useUiStore.getState().setFocusedLeaf(leaf.id)
          useUiStore.getState().closeAllPopovers()
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          useUiStore.getState().startRename(leaf.id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          useUiStore.getState().openCtx(leaf.id, e.clientX, e.clientY)
        }}
      >
        {side === 'right' && (
          <span className="close" onClick={(e) => { e.stopPropagation(); useLeavesStore.getState().closeLeaf(leaf.id) }}>×</span>
        )}
        {catColor && <span className="cat-dot" style={{ background: catColor }} />}
        {renaming ? (
          <input
            ref={inputRef}
            className="rename-input"
            defaultValue={leaf.name}
            autoFocus
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
              else if (e.key === 'Escape') useUiStore.getState().stopRename()
            }}
            onBlur={(e) => commit(e.target.value)}
          />
        ) : (
          <span className="name">{leaf.name}</span>
        )}
        {side === 'left' && (
          <span className="close" onClick={(e) => { e.stopPropagation(); useLeavesStore.getState().closeLeaf(leaf.id) }}>×</span>
        )}
      </div>
    </div>
  )
}
