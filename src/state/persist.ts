// OpenFall — persistence orchestration: hydrate stores on boot, autosave on the
// configured interval, keep the "Saved Ns" clock and theme in sync. Stores stay
// pure; this module is the only place that talks to the platform adapter.
import { getAdapter } from '../platform/adapter'
import { useSettingsStore } from './settingsStore'
import { useLeavesStore } from './leavesStore'
import { useUiStore } from './uiStore'
import { applyTheme, watchSystemTheme } from '../theme/applyTheme'
import { post as busPost, subscribe as busSubscribe } from './bus'
import { SEED_LEAVES, SEED_CATEGORIES, DEFAULT_SETTINGS } from '../lib/seed'
import type { PersistedSnapshot, Settings } from '../types'

export function getSnapshot(): PersistedSnapshot {
  const l = useLeavesStore.getState()
  return {
    leaves: l.leaves,
    activeLeafId: l.activeLeafId,
    categories: l.categories,
    settings: useSettingsStore.getState().settings,
  }
}

function mergeSettings(s?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(s || {}),
    fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc, ...(s?.fileAssoc || {}) },
  }
}

export function applySnapshot(snap: PersistedSnapshot): void {
  const settings = mergeSettings(snap.settings)
  useSettingsStore.getState().replace(settings)
  useLeavesStore.getState().replace({
    leaves: snap.leaves ?? [],
    activeLeafId: snap.activeLeafId ?? snap.leaves?.[0]?.id ?? null,
    categories: snap.categories?.length ? snap.categories : SEED_CATEGORIES,
  })
  applyTheme(settings.theme)
}

function broadcastSaved(): void {
  busPost({ t: 'saved' })
}

/**
 * Re-read the persisted snapshot after another window saved (cross-window sync
 * for Separate View), preserving THIS window's active leaf + its possibly-unsaved
 * in-memory edits so we never clobber what the user is typing here.
 */
export async function rehydratePeer(): Promise<void> {
  const snap = await getAdapter().load()
  if (!snap || !Array.isArray(snap.leaves)) return
  const ls = useLeavesStore.getState()
  const localActive = ls.activeLeafId
  const localLeaves = ls.leaves
  const merged = snap.leaves.map((sl) =>
    sl.id === localActive ? localLeaves.find((l) => l.id === localActive) ?? sl : sl,
  )
  const settings = mergeSettings(snap.settings)
  useSettingsStore.getState().replace(settings)
  ls.replace({
    leaves: merged,
    activeLeafId: merged.some((l) => l.id === localActive)
      ? localActive
      : snap.activeLeafId ?? merged[0]?.id ?? null,
    categories: snap.categories?.length ? snap.categories : ls.categories,
  })
  applyTheme(settings.theme)
}

export async function hydrate(): Promise<void> {
  const snap = await getAdapter().load()
  if (snap && Array.isArray(snap.leaves) && snap.leaves.length) {
    applySnapshot(snap)
  } else {
    // First run — seed the sample journal so the app is immediately explorable.
    applySnapshot({
      leaves: SEED_LEAVES,
      activeLeafId: 't7',
      categories: SEED_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    })
  }
}

/** Start the autosave loop + clocks. Returns a cleanup function. */
export function startPersistence(): () => void {
  const adapter = getAdapter()
  const unsubBus = busSubscribe((m) => {
    if (m.t === 'saved') void rehydratePeer()
  })
  let saveTimer: ReturnType<typeof setInterval> | null = null
  let interval = useSettingsStore.getState().settings.autosaveInterval

  const doSave = async () => {
    try {
      await adapter.save(getSnapshot())
      useUiStore.getState().markSaved(Date.now())
      broadcastSaved()
    } catch {
      /* best effort */
    }
  }
  const arm = () => {
    if (saveTimer) clearInterval(saveTimer)
    saveTimer = setInterval(doSave, Math.max(2, interval) * 1000)
  }
  arm()

  const unsubInterval = useSettingsStore.subscribe((st) => {
    if (st.settings.autosaveInterval !== interval) {
      interval = st.settings.autosaveInterval
      arm()
    }
  })

  let lastTheme = useSettingsStore.getState().settings.theme
  const unsubTheme = useSettingsStore.subscribe((st) => {
    if (st.settings.theme !== lastTheme) {
      lastTheme = st.settings.theme
      applyTheme(lastTheme)
    }
  })
  const unwatchSystem = watchSystemTheme(() => useSettingsStore.getState().settings.theme)

  const tick = setInterval(() => {
    const since = Math.floor((Date.now() - useUiStore.getState().lastSavedAt) / 1000)
    useUiStore.getState().setSavedAgo(since)
  }, 1000)

  const onBeforeUnload = () => {
    void adapter.save(getSnapshot())
  }
  window.addEventListener('beforeunload', onBeforeUnload)

  return () => {
    if (saveTimer) clearInterval(saveTimer)
    clearInterval(tick)
    unsubInterval()
    unsubTheme()
    unwatchSystem()
    window.removeEventListener('beforeunload', onBeforeUnload)
    unsubBus()
  }
}

/** Force an immediate save (e.g. File ▸ Save). */
export async function saveNow(): Promise<void> {
  await getAdapter().save(getSnapshot())
  useUiStore.getState().markSaved(Date.now())
  broadcastSaved()
}
