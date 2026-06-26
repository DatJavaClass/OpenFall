// OpenFall — cross-window message bus. Transport is a localStorage key + the
// `storage` event, which fires across same-origin windows on http(s), app://
// (Electron) AND file:// (the portable client) — unlike BroadcastChannel, which
// does not deliver across null-origin file:// windows. The `storage` event only
// fires in OTHER windows (never the writer), so there is no self-echo.
export type BusMsg =
  | { t: 'saved' }
  | { t: 'who' }
  | { t: 'hello'; id: string; separate: boolean; leafId: string | null; name: string }
  | { t: 'bye'; id: string }
  | { t: 'show'; to: string; leafId: string }

const KEY = 'openfall-bus'
export const WINDOW_ID = Math.random().toString(36).slice(2, 9)
let seq = 0

type Listener = (msg: BusMsg) => void
const listeners = new Set<Listener>()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue) as { m: BusMsg }
      listeners.forEach((l) => l(parsed.m))
    } catch {
      /* ignore malformed */
    }
  })
}

export function post(msg: BusMsg): void {
  try {
    // The unique `s` guarantees the stored value changes every post so the
    // `storage` event always fires, even for identical messages.
    seq += 1
    localStorage.setItem(KEY, JSON.stringify({ s: `${WINDOW_ID}-${seq}`, m: msg }))
  } catch {
    /* storage unavailable / quota */
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function busAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}
