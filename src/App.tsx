// OpenFall — AppWindow: assembles the chrome, the overhanging bookmark rails, the
// workspace, overlays, and dialogs; hydrates state and starts the autosave loop.
import { useEffect, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { MenuBar } from './components/MenuBar'
import { Toolbar } from './components/Toolbar'
import { Workspace } from './components/Workspace'
import { StatusBar } from './components/StatusBar'
import { BookmarkRail } from './components/BookmarkRail'
import { ContextMenu } from './components/ContextMenu'
import { Dialogs } from './components/dialogs/Dialogs'
import { SeparateView } from './components/SeparateView'
import { WindowResizeGrips } from './components/WindowResizeGrips'
import { hydrate, startPersistence } from './state/persist'
import { initWindows } from './state/windows'
import { useUiStore } from './state/uiStore'
import { cmd } from './commands'
import type { Caret } from './components/EditorPane'

export function App() {
  const [caret, setCaret] = useState<Caret>({ ln: 1, col: 1 })
  const [ready, setReady] = useState(false)
  const ctxOpen = useUiStore((s) => !!s.ctxMenu)
  const separateLeafId =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('separate') : null

  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    hydrate().then(() => {
      if (cancelled) return
      setReady(true)
      stop = startPersistence()
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const ui = useUiStore.getState()
        if (ui.renamingId) ui.stopRename()
        else if (ui.dialog) ui.closeDialog()
        else if (ui.activeMenu || ui.toolMenu || ui.ctxMenu) ui.closeAllPopovers()
        else if (ui.resultsView) ui.setResultsView(null)
        return
      }
      // Leaf navigation — Alt+Arrow always; Shift+Arrow only when NOT in a text
      // field (Shift+Arrow selects text in the editor).
      if (e.key.startsWith('Arrow') && (e.altKey || e.shiftKey)) {
        const el = document.activeElement
        const inText = !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
        if (e.altKey || (e.shiftKey && !inText && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault()
          cmd.navLeaf(
            e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right',
          )
          return
        }
      }
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const k = e.key.toLowerCase()
      const handlers: Record<string, () => void> = {
        n: cmd.newLeaf,
        o: () => void cmd.openLeaf(),
        s: () => void cmd.save(),
        w: cmd.closeActive,
        f: () => cmd.openSearch(e.shiftKey ? 'files' : 'search'),
        r: () => cmd.openSearch('replace'),
        ',': cmd.preferences,
        p: cmd.print,
        '=': () => cmd.zoom(1),
        '+': () => cmd.zoom(1),
        '-': () => cmd.zoom(-1),
      }
      const h = handlers[k]
      if (h) {
        e.preventDefault()
        h()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (separateLeafId) return // a Separate-View window registers itself instead
    return initWindows({ separate: false, leafId: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return (
      <div className="of-root">
        <div className="of-backdrop" />
      </div>
    )
  }

  if (separateLeafId) return <SeparateView leafId={separateLeafId} />

  return (
    <div
      className="of-root"
      onClick={() => useUiStore.getState().closeAllPopovers()}
      onContextMenu={() => useUiStore.getState().closeCtx()}
    >
      <div className="of-backdrop" />
      <div className="of-window">
        <div className="of-col">
          <TitleBar />
          <MenuBar />
          <Toolbar />
          <Workspace onCaret={setCaret} />
          <StatusBar caret={caret} />
        </div>
        <BookmarkRail side="left" />
        <BookmarkRail side="right" />
        <Dialogs />
        <WindowResizeGrips />
      </div>
      {ctxOpen && <ContextMenu />}
    </div>
  )
}
