// OpenFall — seed/sample leaves, default categories, default settings, and small
// factories. Ported from docs/design/reference/seed-data.js. Real users start
// with one empty leaf; the seed set is used for first-run demo, dev, and tests.
import type { Category, Leaf, Settings, Side } from '../types'

export const SEED_CATEGORIES: Category[] = [
  { name: 'Text', color: '#8aa6d6' },
  { name: 'Script', color: '#d6a95a' },
  { name: 'Code', color: '#9fb87a' },
  { name: 'Markdown', color: '#d28fae' },
  { name: 'Examined', color: '#74b8b8' },
]

export const PALETTE = ['#8aa6d6', '#d6a95a', '#9fb87a', '#d28fae', '#74b8b8', '#cf9a45', '#c98f8f']

// The set of basic text file types OpenFall reads (like Notepad/Notepad++).
// Most default on; binary-ish (.dat) defaults off. Granular per-type + "Enable all".
export const DEFAULT_FILE_ASSOC: Record<string, boolean> = {
  '.txt': true, '.md': true, '.log': true, '.json': true, '.xml': true,
  '.csv': true, '.tsv': true, '.ini': true, '.cfg': true, '.conf': true,
  '.yaml': true, '.yml': true, '.toml': true, '.html': true, '.htm': true,
  '.css': true, '.js': true, '.mjs': true, '.ts': true, '.jsx': true,
  '.tsx': true, '.py': true, '.rb': true, '.go': true, '.rs': true,
  '.php': true, '.lua': true, '.pl': true, '.sh': true, '.bat': true,
  '.ps1': true, '.sql': true, '.c': true, '.cpp': true, '.h': true,
  '.java': true, '.kt': true, '.swift': true, '.r': true, '.m': true,
  '.tex': true, '.srt': true, '.vtt': true, '.env': true, '.gitignore': true,
  '.gitattributes': true, '.editorconfig': true, '.properties': true,
  '.dat': false,
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  font: 'IBM Plex Mono',
  fontSize: 14,
  autosaveInterval: 30,
  autosaveLocation: '~/Journal/leaves',
  otherView: false,
  showLineNumbers: true,
  wrap: true,
  spellcheck: true,
  fileAssoc: { ...DEFAULT_FILE_ASSOC },
  searchEngine: 'google',
}

// created timestamps spread out so "sort by date" is meaningful.
const t0 = 1712000000000
const day = 43200000

export const SEED_LEAVES: Leaf[] = [
  // ---- left rail: journal ----
  {
    id: 't1', side: 'left', custom: true, category: 'Text', created: t0 - 0 * day,
    name: 'Morning pages · 3 Apr',
    content:
      '3 April — before coffee\n\nThe house is still. I keep returning to that line from the dream: a door that opens onto another door. Wrote three pages by hand last night then lost them, so this is the re-telling.\n\nThings to chase today:\n  · the locked .dat from the old drive\n  · call about the lease\n  · finish the marginalia on Fyldere',
  },
  {
    id: 't2', side: 'left', custom: false, category: 'Text', created: t0 - 1 * day,
    name: 'A door that opens onto',
    content:
      'A door that opens onto another door, and behind it the same hallway repeating. I think the hallway is the point — not the rooms.\n\nKeep this one. Might become something.',
  },
  {
    id: 't3', side: 'left', custom: true, category: null, created: t0 - 2 * day,
    name: 'Grocery cipher',
    content: 'rye / oat milk / the good salt\nfigs if they have them\nnotebook — the soft cover one',
  },
  // ---- right rail: examiner ----
  {
    id: 't4', side: 'right', custom: true, category: 'Examined', created: t0 - 3 * day,
    name: 'Fyldere.hexdump',
    content:
      '00000000  ff d8 ff e0 00 10 4a 46  49 46 00 01 01 00 00 01  |......JFIF......|\n00000010  00 01 00 00 ff db 00 43  00 08 06 06 07 06 05 08  |.......C........|\n00000020  07 07 07 09 09 08 0a 0c  14 0d 0c 0b 0b 0c 19 12  |................|\n00000030  13 0f 14 1d 1a 1f 1e 1d  1a 1c 1c 20 24 2e 27 20  |........... $.\' |\n\n— examined: looks like a JPEG header wearing a .dat coat.',
  },
  {
    id: 't5', side: 'right', custom: true, category: 'Text', created: t0 - 4 * day,
    name: 'pasted-links.txt',
    content:
      'https://example.com/assets/fyldere-mortal.jpg\n\n\n\nhttps://example.com/assets/fyldere-dragon.jpg\n\n— pasted links, examined in OpenFall',
  },
  {
    id: 't6', side: 'right', custom: false, category: 'Code', created: t0 - 5 * day,
    name: 'meta { author:',
    content:
      '{\n  "meta": { "author": "unknown", "encoding": "??" },\n  "bytes": 40213,\n  "guess": "image/jpeg",\n  "notes": "renamed by hand, examined in OpenFall"\n}',
  },
  {
    id: 't7', side: 'right', custom: true, category: 'Code', created: t0 - 6 * day,
    name: 'scratch.js',
    content:
      'const sigils = [\'oak\', \'rye\', 42, true, null];\n\n// examined leaf — origin unknown, opened in OpenFall\nfunction unfold(door, depth) {\n  if (depth <= 0) return null;\n  const next = { door: door + 1, seen: false };\n  return unfold(next, depth - 1);\n}\n\nclass Hallway extends Corridor {\n  constructor(rooms = 7) {\n    super();\n    this.rooms = rooms;\n    this.echo = "a door that opens onto another door";\n  }\n\n  walk() {\n    for (let i = 0; i < this.rooms; i++) {\n      console.log(`room ${i}`, sigils[i % 5]);\n    }\n  }\n}\n\nexport const h = new Hallway(12);',
  },
]

let idCounter = 0
/** Stable-ish unique id for a new leaf. */
export function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  idCounter += 1
  return `leaf-${Date.now().toString(36)}-${idCounter}`
}

/** A fresh empty leaf for the given side. */
export function makeLeaf(side: Side): Leaf {
  return {
    id: genId(),
    side,
    name: 'Untitled leaf',
    custom: false,
    content: '',
    category: null,
    created: Date.now(),
  }
}
