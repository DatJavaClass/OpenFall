import { describe, it, expect, beforeEach } from 'vitest'
import { getSnapshot, applySnapshot, hydrate, saveNow } from '../src/state/persist'
import { useLeavesStore } from '../src/state/leavesStore'
import { useSettingsStore } from '../src/state/settingsStore'
import { DEFAULT_SETTINGS, SEED_CATEGORIES } from '../src/lib/seed'
import type { Leaf, PersistedSnapshot } from '../src/types'

// ---- fixtures -------------------------------------------------------------
const mk = (over: Partial<Leaf> = {}): Leaf => ({
  id: 'id',
  side: 'left',
  name: 'note',
  custom: false,
  content: '',
  category: null,
  created: 0,
  ...over,
})

const resetLeaves = () =>
  useLeavesStore.getState().replace({ leaves: [], activeLeafId: null, categories: [] })
const resetSettings = () =>
  useSettingsStore.getState().replace({ ...DEFAULT_SETTINGS, fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc } })

const leaves = () => useLeavesStore.getState().leaves
const settings = () => useSettingsStore.getState().settings

beforeEach(() => {
  // Deterministic first-run conditions: empty stores + empty localStorage.
  // getAdapter() resolves to the WebAdapter in jsdom (no window.openfall), so
  // load()/save() hit real localStorage — no mocking needed.
  resetLeaves()
  resetSettings()
  localStorage.clear()
})

// ===========================================================================
// getSnapshot
// ===========================================================================
describe('getSnapshot', () => {
  it('reflects the current state of both stores', () => {
    const fixtureLeaves = [mk({ id: 'a' }), mk({ id: 'b', side: 'right' })]
    const fixtureCats = [{ name: 'C', color: '#111111' }]
    useLeavesStore.getState().replace({ leaves: fixtureLeaves, activeLeafId: 'b', categories: fixtureCats })

    const fixtureSettings = { ...DEFAULT_SETTINGS, theme: 'light' as const, fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc } }
    useSettingsStore.getState().replace(fixtureSettings)

    expect(getSnapshot()).toEqual({
      leaves: fixtureLeaves,
      activeLeafId: 'b',
      categories: fixtureCats,
      settings: fixtureSettings,
    })
  })
})

// ===========================================================================
// applySnapshot  (inverse of getSnapshot)
// ===========================================================================
describe('applySnapshot', () => {
  it('populates both stores from a snapshot', () => {
    const snap: PersistedSnapshot = {
      leaves: [mk({ id: 'one', content: 'hi' })],
      activeLeafId: 'one',
      categories: [{ name: 'Solo', color: '#abcdef' }],
      settings: { ...DEFAULT_SETTINGS, theme: 'light', fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc } },
    }
    applySnapshot(snap)
    expect(leaves()).toEqual(snap.leaves)
    expect(useLeavesStore.getState().activeLeafId).toBe('one')
    expect(useLeavesStore.getState().categories).toEqual(snap.categories)
    expect(settings().theme).toBe('light')
  })

  it('is the inverse of getSnapshot — a full round-trip restores the captured state', () => {
    // Arrange a fully-specified state (non-empty categories + a real activeLeafId
    // so applySnapshot keeps them verbatim rather than applying its fallbacks).
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'a', content: 'alpha' }), mk({ id: 'b', side: 'right', custom: true, name: 'B' })],
      activeLeafId: 'a',
      categories: [{ name: 'Cat', color: '#abcabc' }],
    })
    useSettingsStore.getState().replace({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      fontSize: 18,
      fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc, '.csv': true },
    })

    const saved = JSON.parse(JSON.stringify(getSnapshot())) as PersistedSnapshot

    // Mutate the stores well away from `saved`.
    useLeavesStore.getState().newLeaf()
    useSettingsStore.getState().setTheme('dark')
    useSettingsStore.getState().zoom(2)

    // Applying the captured snapshot must restore it exactly.
    applySnapshot(saved)
    expect(getSnapshot()).toEqual(saved)
  })

  it('falls back to SEED_CATEGORIES when the snapshot has no categories', () => {
    applySnapshot({
      leaves: [mk({ id: 'x' })],
      activeLeafId: null,
      categories: [],
      settings: DEFAULT_SETTINGS,
    })
    expect(useLeavesStore.getState().categories).toEqual(SEED_CATEGORIES)
  })

  it('falls back the active selection to the first leaf when activeLeafId is null', () => {
    applySnapshot({
      leaves: [mk({ id: 'first' }), mk({ id: 'second' })],
      activeLeafId: null,
      categories: [{ name: 'C', color: '#000000' }],
      settings: DEFAULT_SETTINGS,
    })
    expect(useLeavesStore.getState().activeLeafId).toBe('first')
  })
})

// ===========================================================================
// hydrate  (+ persistence round-trip through localStorage via saveNow)
// ===========================================================================
describe('hydrate', () => {
  it('seeds the 7 sample leaves and the seed categories on first run (empty storage)', async () => {
    await hydrate()
    expect(leaves()).toHaveLength(7)
    expect(useLeavesStore.getState().categories).toEqual(SEED_CATEGORIES)
    expect(useLeavesStore.getState().activeLeafId).toBe('t7')
  })

  it('round-trips through localStorage: saveNow then hydrate restores the SAVED state, not the seed', async () => {
    // First run seeds the sample journal...
    await hydrate()
    expect(leaves()).toHaveLength(7)

    // ...now replace it with a distinctive single-leaf state and persist it.
    const distinctive = {
      leaves: [mk({ id: 'c1', name: 'My only leaf', custom: true, content: 'kept across reload' })],
      activeLeafId: 'c1',
      categories: [{ name: 'Solo', color: '#abcdef' }],
    }
    useLeavesStore.getState().replace(distinctive)
    useSettingsStore.getState().setTheme('light')
    await saveNow()

    // Simulate a fresh boot: wipe in-memory stores (localStorage stays).
    resetLeaves()
    resetSettings()
    expect(leaves()).toHaveLength(0)

    // Hydrating now must read the SAVED snapshot back, not re-seed.
    await hydrate()
    expect(leaves()).toHaveLength(1)
    expect(leaves()[0].id).toBe('c1')
    expect(leaves()[0].content).toBe('kept across reload')
    expect(useLeavesStore.getState().activeLeafId).toBe('c1')
    expect(useLeavesStore.getState().categories).toEqual(distinctive.categories)
    expect(settings().theme).toBe('light')
  })

  it('treats a stored snapshot with an empty leaves array as first run (re-seeds)', async () => {
    // The WebAdapter writes whatever getSnapshot() returns; an empty-leaves
    // snapshot is indistinguishable from first run per hydrate()'s guard.
    useLeavesStore.getState().replace({ leaves: [], activeLeafId: null, categories: [] })
    await saveNow()
    resetLeaves()

    await hydrate()
    expect(leaves()).toHaveLength(7)
  })
})
