import { describe, it, expect, beforeEach } from 'vitest'
import { useLeavesStore } from '../src/state/leavesStore'
import { useSettingsStore } from '../src/state/settingsStore'
import { DEFAULT_SETTINGS } from '../src/lib/seed'
import { sortLeaves } from '../src/lib/search'
import type { Leaf } from '../src/types'

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

const leaves = () => useLeavesStore.getState().leaves
const ids = () => leaves().map((l) => l.id)
const byId = (id: string) => leaves().find((l) => l.id === id)
const settings = () => useSettingsStore.getState().settings

beforeEach(() => {
  // Pure reset of both stores so every test starts from a known, empty state.
  useLeavesStore.getState().replace({ leaves: [], activeLeafId: null, categories: [] })
  useSettingsStore.getState().replace({ ...DEFAULT_SETTINGS, fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc } })
})

// ===========================================================================
// useLeavesStore
// ===========================================================================
describe('useLeavesStore.newLeaf', () => {
  it('appends an empty untitled leaf, selects it, and returns its id', () => {
    const id = useLeavesStore.getState().newLeaf()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    expect(leaves()).toHaveLength(1)

    const leaf = byId(id)!
    expect(leaf.name).toBe('Untitled leaf')
    expect(leaf.custom).toBe(false)
    expect(leaf.content).toBe('')
    expect(leaf.category).toBeNull()
    expect(useLeavesStore.getState().activeLeafId).toBe(id)
  })

  it('opens on the left rail when the rails are tied (0–0 and 1–1)', () => {
    expect(byId(useLeavesStore.getState().newLeaf())!.side).toBe('left') // 0–0 tie

    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'l1', side: 'left' }), mk({ id: 'r1', side: 'right' })],
      activeLeafId: 'l1',
      categories: [],
    })
    expect(byId(useLeavesStore.getState().newLeaf())!.side).toBe('left') // 1–1 tie
  })

  it('opens on the rail with fewer leaves (right when left has more)', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'l1', side: 'left' }), mk({ id: 'l2', side: 'left' }), mk({ id: 'r1', side: 'right' })],
      activeLeafId: 'l1',
      categories: [],
    })
    expect(byId(useLeavesStore.getState().newLeaf())!.side).toBe('right')
  })

  it('opens on the left rail when the right rail has more', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'l1', side: 'left' }), mk({ id: 'r1', side: 'right' }), mk({ id: 'r2', side: 'right' })],
      activeLeafId: 'r1',
      categories: [],
    })
    expect(byId(useLeavesStore.getState().newLeaf())!.side).toBe('left')
  })

  it('keeps previously-opened leaves and appends to the end', () => {
    useLeavesStore.getState().replace({ leaves: [mk({ id: 'a' })], activeLeafId: 'a', categories: [] })
    const id = useLeavesStore.getState().newLeaf()
    expect(ids()).toEqual(['a', id])
  })
})

describe('useLeavesStore.addLeaf', () => {
  it('appends a custom, active leaf with the given name and content', () => {
    const id = useLeavesStore.getState().addLeaf('hello.txt', 'file body')
    const leaf = byId(id)!
    expect(leaf.name).toBe('hello.txt')
    expect(leaf.content).toBe('file body')
    expect(leaf.custom).toBe(true)
    expect(useLeavesStore.getState().activeLeafId).toBe(id)
  })

  it('falls back to "Untitled leaf" when name is empty (still custom)', () => {
    const id = useLeavesStore.getState().addLeaf('', 'content only')
    const leaf = byId(id)!
    expect(leaf.name).toBe('Untitled leaf')
    expect(leaf.custom).toBe(true)
    expect(leaf.content).toBe('content only')
  })

  it('places the opened file on the lighter rail', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'l1', side: 'left' }), mk({ id: 'l2', side: 'left' })],
      activeLeafId: 'l1',
      categories: [],
    })
    expect(byId(useLeavesStore.getState().addLeaf('x.txt', ''))!.side).toBe('right')
  })
})

describe('useLeavesStore.closeLeaf', () => {
  const seed = () =>
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'A' }), mk({ id: 'B' }), mk({ id: 'C' })],
      activeLeafId: 'B',
      categories: [],
    })

  it('removes the leaf and leaves the active selection alone when a non-active leaf closes', () => {
    seed()
    useLeavesStore.getState().closeLeaf('C')
    expect(ids()).toEqual(['A', 'B'])
    expect(useLeavesStore.getState().activeLeafId).toBe('B')
  })

  it('moves the active selection to the neighbor at the same index when the active middle leaf closes', () => {
    seed() // active = B (index 1)
    useLeavesStore.getState().closeLeaf('B')
    // After removal [A, C]; index 1 -> C
    expect(ids()).toEqual(['A', 'C'])
    expect(useLeavesStore.getState().activeLeafId).toBe('C')
  })

  it('clamps to the new last leaf when the active last leaf closes', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'A' }), mk({ id: 'B' }), mk({ id: 'C' })],
      activeLeafId: 'C',
      categories: [],
    })
    useLeavesStore.getState().closeLeaf('C') // index 2 -> clamp to index 1 (B)
    expect(ids()).toEqual(['A', 'B'])
    expect(useLeavesStore.getState().activeLeafId).toBe('B')
  })

  it('selects the leaf that shifts into index 0 when the active first leaf closes', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'A' }), mk({ id: 'B' }), mk({ id: 'C' })],
      activeLeafId: 'A',
      categories: [],
    })
    useLeavesStore.getState().closeLeaf('A') // index 0 -> B
    expect(ids()).toEqual(['B', 'C'])
    expect(useLeavesStore.getState().activeLeafId).toBe('B')
  })

  it('sets activeLeafId to null when the last remaining leaf closes', () => {
    useLeavesStore.getState().replace({ leaves: [mk({ id: 'only' })], activeLeafId: 'only', categories: [] })
    useLeavesStore.getState().closeLeaf('only')
    expect(leaves()).toHaveLength(0)
    expect(useLeavesStore.getState().activeLeafId).toBeNull()
  })
})

describe('useLeavesStore.selectLeaf', () => {
  it('sets the active leaf id', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'A' }), mk({ id: 'B' })],
      activeLeafId: 'A',
      categories: [],
    })
    useLeavesStore.getState().selectLeaf('B')
    expect(useLeavesStore.getState().activeLeafId).toBe('B')
  })
})

describe('useLeavesStore.editLeaf', () => {
  it('updates content and re-derives the name while custom === false', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'x', custom: false, name: 'old name', content: '' })],
      activeLeafId: 'x',
      categories: [],
    })
    useLeavesStore.getState().editLeaf('x', 'Fresh title\nsecond line')
    const leaf = byId('x')!
    expect(leaf.content).toBe('Fresh title\nsecond line')
    expect(leaf.name).toBe('Fresh title') // deriveLeafName(content)
  })

  it('updates content but KEEPS the name while custom === true', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'y', custom: true, name: 'Kept name', content: '' })],
      activeLeafId: 'y',
      categories: [],
    })
    useLeavesStore.getState().editLeaf('y', 'totally different content')
    const leaf = byId('y')!
    expect(leaf.content).toBe('totally different content')
    expect(leaf.name).toBe('Kept name')
  })

  it('only touches the targeted leaf', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'a', content: 'aaa' }), mk({ id: 'b', content: 'bbb' })],
      activeLeafId: 'a',
      categories: [],
    })
    useLeavesStore.getState().editLeaf('a', 'changed')
    expect(byId('b')!.content).toBe('bbb')
  })
})

describe('useLeavesStore.renameLeaf', () => {
  it('trims the new name and marks the leaf custom', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'r', custom: false, name: 'Original' })],
      activeLeafId: 'r',
      categories: [],
    })
    useLeavesStore.getState().renameLeaf('r', '  Renamed  ')
    const leaf = byId('r')!
    expect(leaf.name).toBe('Renamed')
    expect(leaf.custom).toBe(true)
  })

  it('keeps the old name for an empty string but still flips custom to true', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'r', custom: false, name: 'Keep me' })],
      activeLeafId: 'r',
      categories: [],
    })
    useLeavesStore.getState().renameLeaf('r', '')
    const leaf = byId('r')!
    expect(leaf.name).toBe('Keep me')
    expect(leaf.custom).toBe(true)
  })

  it('keeps the old name for a whitespace-only rename', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'r', name: 'Keep me' })],
      activeLeafId: 'r',
      categories: [],
    })
    useLeavesStore.getState().renameLeaf('r', '   \t  ')
    expect(byId('r')!.name).toBe('Keep me')
  })
})

describe('useLeavesStore.assignCategory', () => {
  it('assigns a category and can clear it back to null', () => {
    useLeavesStore.getState().replace({
      leaves: [mk({ id: 'a', category: null })],
      activeLeafId: 'a',
      categories: [],
    })
    useLeavesStore.getState().assignCategory('a', 'Code')
    expect(byId('a')!.category).toBe('Code')

    useLeavesStore.getState().assignCategory('a', null)
    expect(byId('a')!.category).toBeNull()
  })
})

describe('useLeavesStore.addCategory', () => {
  it('appends a new category', () => {
    useLeavesStore.getState().addCategory('Alpha', '#111111')
    useLeavesStore.getState().addCategory('Beta', '#222222')
    expect(useLeavesStore.getState().categories).toEqual([
      { name: 'Alpha', color: '#111111' },
      { name: 'Beta', color: '#222222' },
    ])
  })

  it('ignores a duplicate name (keeps the original color)', () => {
    useLeavesStore.getState().addCategory('Alpha', '#111111')
    useLeavesStore.getState().addCategory('Alpha', '#999999')
    expect(useLeavesStore.getState().categories).toEqual([{ name: 'Alpha', color: '#111111' }])
  })
})

describe('useLeavesStore.sortAll', () => {
  it('reorders leaves by delegating to sortLeaves (date, default newest-first per rail)', () => {
    const input = [
      mk({ id: 'A', side: 'left', created: 100 }),
      mk({ id: 'B', side: 'left', created: 300 }),
      mk({ id: 'C', side: 'right', created: 200 }),
      mk({ id: 'D', side: 'right', created: 400 }),
    ]
    useLeavesStore.getState().replace({ leaves: input, activeLeafId: 'A', categories: [] })
    useLeavesStore.getState().sortAll('date')

    expect(ids()).toEqual(sortLeaves(input, 'date').map((l) => l.id))
    expect(ids()).toEqual(['B', 'A', 'D', 'C'])
    expect(useLeavesStore.getState().activeLeafId).toBe('A') // sorting does not change selection
  })

  it('passes the direction argument through to sortLeaves', () => {
    const input = [
      mk({ id: 'm', side: 'left', name: 'mango' }),
      mk({ id: 'a', side: 'left', name: 'apple' }),
    ]
    useLeavesStore.getState().replace({ leaves: input, activeLeafId: 'm', categories: [] })
    useLeavesStore.getState().sortAll('alpha', 'asc')
    expect(ids()).toEqual(['a', 'm'])
  })
})

describe('useLeavesStore.replace', () => {
  it('wholesale-sets leaves, activeLeafId, and categories', () => {
    const data = {
      leaves: [mk({ id: 'z', name: 'zed' })],
      activeLeafId: 'z',
      categories: [{ name: 'Q', color: '#000000' }],
    }
    useLeavesStore.getState().replace(data)
    expect(leaves()).toEqual(data.leaves)
    expect(useLeavesStore.getState().activeLeafId).toBe('z')
    expect(useLeavesStore.getState().categories).toEqual(data.categories)
  })
})

// ===========================================================================
// useSettingsStore
// ===========================================================================
describe('useSettingsStore.set', () => {
  it('sets an arbitrary key without clamping (contrast with zoom)', () => {
    useSettingsStore.getState().set('autosaveInterval', 60)
    expect(settings().autosaveInterval).toBe(60)

    useSettingsStore.getState().set('autosaveLocation', '/somewhere/else')
    expect(settings().autosaveLocation).toBe('/somewhere/else')

    useSettingsStore.getState().set('fontSize', 99) // set() does not clamp
    expect(settings().fontSize).toBe(99)
  })
})

describe('useSettingsStore.setTheme', () => {
  it('updates the theme choice', () => {
    useSettingsStore.getState().setTheme('light')
    expect(settings().theme).toBe('light')
    useSettingsStore.getState().setTheme('system')
    expect(settings().theme).toBe('system')
  })
})

describe('useSettingsStore.toggle', () => {
  it('flips each boolean toggle key from its default', () => {
    // defaults: otherView=false, showLineNumbers=true, wrap=true, spellcheck=true
    useSettingsStore.getState().toggle('otherView')
    expect(settings().otherView).toBe(true)

    useSettingsStore.getState().toggle('showLineNumbers')
    expect(settings().showLineNumbers).toBe(false)

    useSettingsStore.getState().toggle('wrap')
    expect(settings().wrap).toBe(false)

    useSettingsStore.getState().toggle('spellcheck')
    expect(settings().spellcheck).toBe(false)
  })

  it('returns to the original value after two toggles', () => {
    useSettingsStore.getState().toggle('wrap')
    useSettingsStore.getState().toggle('wrap')
    expect(settings().wrap).toBe(true)
  })
})

describe('useSettingsStore.zoom', () => {
  it('adds the delta to the font size (default 14)', () => {
    useSettingsStore.getState().zoom(2)
    expect(settings().fontSize).toBe(16)
  })

  it('accumulates across calls', () => {
    useSettingsStore.getState().zoom(1)
    useSettingsStore.getState().zoom(1)
    expect(settings().fontSize).toBe(16)
  })

  it('clamps to the lower bound of 11', () => {
    useSettingsStore.getState().zoom(-100)
    expect(settings().fontSize).toBe(11)
  })

  it('clamps to the upper bound of 22', () => {
    useSettingsStore.getState().zoom(100)
    expect(settings().fontSize).toBe(22)
  })

  it('reaches exactly 11 and 22 at the boundaries', () => {
    useSettingsStore.getState().zoom(-3) // 14 -> 11
    expect(settings().fontSize).toBe(11)
    useSettingsStore.getState().zoom(11) // 11 -> 22
    expect(settings().fontSize).toBe(22)
  })
})

describe('useSettingsStore.setFileAssoc', () => {
  it('flips an existing association on/off without disturbing the others', () => {
    expect(settings().fileAssoc['.dat']).toBe(false)
    useSettingsStore.getState().setFileAssoc('.dat', true)
    expect(settings().fileAssoc['.dat']).toBe(true)
    expect(settings().fileAssoc['.txt']).toBe(true) // untouched

    useSettingsStore.getState().setFileAssoc('.txt', false)
    expect(settings().fileAssoc['.txt']).toBe(false)
    expect(settings().fileAssoc['.dat']).toBe(true) // untouched
  })

  it('adds a brand-new extension key', () => {
    useSettingsStore.getState().setFileAssoc('.csv', true)
    expect(settings().fileAssoc['.csv']).toBe(true)
  })
})

describe('useSettingsStore.replace', () => {
  it('wholesale-replaces the settings object', () => {
    const next = {
      ...DEFAULT_SETTINGS,
      theme: 'light' as const,
      font: 'Comic Sans',
      fontSize: 21,
      fileAssoc: { '.foo': true },
    }
    useSettingsStore.getState().replace(next)
    expect(settings()).toEqual(next)
  })
})
