// OpenFall — workspace: the editor pane(s) + Other-View split + the search
// results docks (terminal at bottom, list on the inner side). Rails are rendered
// by App at the window level so they can overhang the transparent margin.
import { useEffect, useRef, useState } from 'react'
import { useLeavesStore } from '../state/leavesStore'
import { useSettingsStore } from '../state/settingsStore'
import { useUiStore } from '../state/uiStore'
import { useWindowsStore } from '../state/windows'
import { EditorPane } from './EditorPane'
import type { Caret } from './EditorPane'
import { TerminalResults, ListResults } from './SearchResults'
import { cmd } from '../commands'

export function Workspace({ onCaret }: { onCaret: (c: Caret) => void }) {
  const { leaves, activeLeafId } = useLeavesStore()
  const otherView = useSettingsStore((s) => s.settings.otherView)
  const otherLeafId = useUiStore((s) => s.otherLeafId)
  const resultsView = useUiStore((s) => s.resultsView)

  // Leaves moved out into Separate-View windows aren't shown here.
  const peers = useWindowsStore((s) => s.peers)
  const held = new Set(peers.filter((p) => p.separate && p.leafId).map((p) => p.leafId as string))
  const visible = leaves.filter((l) => !held.has(l.id))

  const active = visible.find((l) => l.id === activeLeafId) ?? visible[0]
  // No `?? active` fallback — if there's no DISTINCT second leaf, the Other-View
  // pane simply doesn't render (it used to duplicate the active leaf).
  const other =
    visible.find((l) => l.id === otherLeafId && l.id !== active?.id) ??
    visible.find((l) => l.id !== active?.id)

  // If the active leaf was moved to another window, follow it to a visible one.
  useEffect(() => {
    if (active && active.id !== activeLeafId) useLeavesStore.getState().selectLeaf(active.id)
  }, [active?.id, activeLeafId])

  // Other-View split ratio (draggable divider).
  const [ratio, setRatio] = useState(0.5)
  const areaRef = useRef<HTMLDivElement>(null)

  return (
    <div className="of-workspace">
      <div className="of-editor-area" ref={areaRef}>
        {active ? (
          <EditorPane
            leaf={active}
            onCaret={onCaret}
            style={otherView && other ? { flex: `0 0 ${ratio * 100}%` } : undefined}
          />
        ) : (
          <div className="of-empty">
            <button className="of-btn primary" onClick={cmd.newLeaf}>Begin a new leaf</button>
          </div>
        )}
        {otherView && active && other && (
          <>
            <div
              className="of-divider of-divider-drag"
              title="Drag to resize"
              onMouseDown={(e) => {
                e.preventDefault()
                const area = areaRef.current
                if (!area) return
                const rect = area.getBoundingClientRect()
                const move = (ev: MouseEvent) =>
                  setRatio(Math.min(0.8, Math.max(0.2, (ev.clientX - rect.left) / rect.width)))
                const up = () => {
                  window.removeEventListener('mousemove', move)
                  window.removeEventListener('mouseup', up)
                }
                window.addEventListener('mousemove', move)
                window.addEventListener('mouseup', up)
              }}
            />
            <EditorPane leaf={other} isOther />
          </>
        )}
        {resultsView === 'list' && <ListResults />}
      </div>
      {resultsView === 'terminal' && <TerminalResults />}
    </div>
  )
}
