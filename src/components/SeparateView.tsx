/* Separate View: a window scoped to one leaf.
   Shares the store; syncs via persist.ts BroadcastChannel. */
import { useEffect, useState } from 'react'
import { useLeavesStore } from '../state/leavesStore'
import { getAdapter } from '../platform/adapter'
import { initWindows, announceLeaf, leaveWindow } from '../state/windows'
import { EditorPane } from './EditorPane'
import type { Caret } from './EditorPane'
import { StatusBar } from './StatusBar'
import { WindowResizeGrips } from './WindowResizeGrips'

export function SeparateView({ leafId: initialLeafId }: { leafId: string }) {
  const [caret, setCaret] = useState<Caret>({ ln: 1, col: 1 })
  const [leafId, setLeafId] = useState(initialLeafId)
  const leaf = useLeavesStore((s) => s.leaves.find((l) => l.id === leafId))

  useEffect(() => {
    // Scope this window's active leaf.
    if (useLeavesStore.getState().activeLeafId !== leafId) useLeavesStore.getState().selectLeaf(leafId)
  }, [leafId])

  useEffect(() => {
    return initWindows({
      separate: true,
      leafId: initialLeafId,
      onShow: (id) => {
        setLeafId(id)
        announceLeaf(id)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ctl = (a: 'minimize' | 'maximize' | 'close') => () => getAdapter().windowControl(a)
  // Return leaf to the main window, then close.
  const rejoin = () => {
    leaveWindow()
    getAdapter().windowControl('close')
  }

  return (
    <div className="of-root">
      <div className="of-backdrop" />
      <div className="of-window of-window-sep">
        <div className="of-col">
          <div className="of-titlebar">
            <div className="of-logo">OF</div>
            <div className="of-title-leafname">{leaf ? leaf.name : 'Leaf closed'}</div>
            <div className="of-title-app">OpenFall · Separate View</div>
            <div className="of-title-spacer" />
            <button className="of-tb-btn" title="Return this leaf to the main window" onClick={rejoin} style={{ marginRight: 6 }}>
              ⤵ Rejoin
            </button>
            <div className="of-win-btns">
              <button className="of-win-btn" title="Minimize" onClick={ctl('minimize')}>&#8212;</button>
              <button className="of-win-btn" title="Maximize" onClick={ctl('maximize')}>&#9633;</button>
              <button className="of-win-btn of-close" title="Close (returns leaf to main)" onClick={rejoin}>&#10005;</button>
            </div>
          </div>
          <div className="of-workspace">
            <div className="of-editor-area">
              {leaf ? (
                <EditorPane leaf={leaf} onCaret={setCaret} />
              ) : (
                <div className="of-empty">This leaf was closed in the main window.</div>
              )}
            </div>
          </div>
          <StatusBar caret={caret} />
        </div>
        <WindowResizeGrips />
      </div>
    </div>
  )
}
