// OpenFall — open-window registry behind Join View. Each window announces itself
// on the bus; the Join dropdown lists the open Separate-View windows, and choosing
// one sends the current leaf to it (it switches to display that leaf).
import { create } from 'zustand'
import { WINDOW_ID, post, subscribe, busAvailable, type BusMsg } from './bus'
import { useLeavesStore } from './leavesStore'

export interface Peer {
  id: string
  separate: boolean
  leafId: string | null
  name: string
}

interface WindowsState {
  separate: boolean
  selfLeafId: string | null
  peers: Peer[]
  /** Clear + re-solicit the roster (call when opening the Join dropdown). */
  refresh(): void
}

export const useWindowsStore = create<WindowsState>((set) => ({
  separate: false,
  selfLeafId: null,
  peers: [],
  refresh: () => {
    // Re-solicit without clearing — the registry is kept live by hello/bye, and
    // clearing would briefly un-hide moved leaves in the main rails.
    post({ t: 'who' })
  },
}))

function describeSelf(): BusMsg {
  const { separate, selfLeafId } = useWindowsStore.getState()
  const name = selfLeafId
    ? useLeavesStore.getState().leaves.find((l) => l.id === selfLeafId)?.name ?? 'Leaf'
    : 'Main window'
  return { t: 'hello', id: WINDOW_ID, separate, leafId: selfLeafId, name }
}

/**
 * Register this window on the bus. `onShow` fires when another window sends us a
 * leaf to display (Join View). Returns a cleanup function.
 */
export function initWindows(opts: {
  separate: boolean
  leafId: string | null
  onShow?: (leafId: string) => void
}): () => void {
  useWindowsStore.setState({ separate: opts.separate, selfLeafId: opts.leafId })
  if (!busAvailable()) return () => {}

  const unsub = subscribe((m) => {
    if (m.t === 'who') {
      post(describeSelf())
    } else if (m.t === 'hello') {
      useWindowsStore.setState((st) => ({
        peers: [...st.peers.filter((p) => p.id !== m.id), { id: m.id, separate: m.separate, leafId: m.leafId, name: m.name }],
      }))
    } else if (m.t === 'bye') {
      useWindowsStore.setState((st) => ({ peers: st.peers.filter((p) => p.id !== m.id) }))
    } else if (m.t === 'show' && m.to === WINDOW_ID) {
      opts.onShow?.(m.leafId)
    }
  })

  post(describeSelf()) // announce presence to existing windows
  post({ t: 'who' }) // and learn who else is open
  const onUnload = () => post({ t: 'bye', id: WINDOW_ID })
  window.addEventListener('beforeunload', onUnload)

  return () => {
    unsub()
    window.removeEventListener('beforeunload', onUnload)
    post({ t: 'bye', id: WINDOW_ID })
  }
}

/** Tell other windows this one is leaving (so the main rails reclaim its leaf). */
export function leaveWindow(): void {
  post({ t: 'bye', id: WINDOW_ID })
}

/** Update this window's advertised leaf (e.g. after a Join) and re-announce. */
export function announceLeaf(leafId: string | null): void {
  useWindowsStore.setState({ selfLeafId: leafId })
  if (busAvailable()) post(describeSelf())
}

/** Join View — send a leaf to another open window. */
export function sendLeafTo(targetId: string, leafId: string): void {
  post({ t: 'show', to: targetId, leafId })
}
