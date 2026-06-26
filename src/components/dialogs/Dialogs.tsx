// OpenFall — modal dialogs (Preferences, Find & Transform, Export As, Auto Save
// Interval, Sort Leaves, About, Shortcuts), elevated to the hi-fi spec
// (BEHAVIOR_SPEC §8 + README §8). Store wiring is preserved from the baseline;
// this pass upgrades layout/visual fidelity only. Layout lives in styles/dialogs.css.
import { useState, type ReactNode } from 'react'
import { useUiStore } from '../../state/uiStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useLeavesStore } from '../../state/leavesStore'
import { compileQuery } from '../../lib/search'
import { convertLeaf, EXPORT_TARGETS, slugify, type ExportFormat } from '../../lib/export'
import { getAdapter } from '../../platform/adapter'
import { cmd } from '../../commands'
import { ENGINES } from '../../lib/websearch'
import type { PrefsSection, SearchEngine, SearchMode, SortMode, ThemeChoice } from '../../types'

// ---------- shared primitives ----------
function Overlay({
  width,
  height,
  title,
  pad = true,
  children,
}: {
  width: number
  height?: number
  title: string
  pad?: boolean
  children: ReactNode
}) {
  const close = () => useUiStore.getState().closeDialog()
  return (
    <div className="of-dialog-overlay" onClick={close}>
      <div className="of-dialog" style={{ width, height }} onClick={(e) => e.stopPropagation()}>
        <div className="of-dialog-header">
          <span className="of-dialog-title">{title}</span>
          <button className="of-dialog-x" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        {pad ? <div className="of-dialog-body">{children}</div> : children}
      </div>
    </div>
  )
}

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button className={'of-pill' + (on ? ' on' : '')} onClick={onClick}>
    {children}
  </button>
)

/** A small reusable toggle switch (track + sliding knob). Visual only — the row
 *  owns the click target so the whole row is interactive (see ToggleRow). */
const Toggle = ({ on }: { on: boolean }) => (
  <span className={'of-toggle' + (on ? ' on' : '')} aria-hidden="true">
    <span className="of-toggle-dot" />
  </span>
)

const ToggleRow = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <div
    className="of-toggle-row"
    role="switch"
    aria-checked={on}
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    }}
  >
    <Toggle on={on} />
    {children}
  </div>
)

// Interval pills are shared by Preferences ▸ Autosave and the quick Interval dialog.
const INTERVALS: Array<[number, string]> = [
  [10, '10s'],
  [30, '30s'],
  [60, '1 min'],
  [300, '5 min'],
]

// ---------- Preferences ----------
const PREF_SECTIONS: Array<[PrefsSection, string]> = [
  ['appearance', 'Appearance'],
  ['editor', 'Editor'],
  ['autosave', 'Autosave'],
  ['files', 'File Associations'],
  ['plugins', 'Plugins (Testing)'],
]

const THEME_CHOICES: Array<[ThemeChoice, string]> = [
  ['dark', 'Dark'],
  ['light', 'Light'],
  ['system', 'Match System'],
]

const FONT_CHOICES = ['IBM Plex Mono', 'Newsreader', 'IBM Plex Sans']

const EDITOR_TOGGLES = [
  ['otherView', 'Enable Other View', 'Split the page into two examiners side by side.'],
  ['showLineNumbers', 'Show Line Numbers', 'Gutter with line counts — useful for odd files.'],
  ['wrap', 'Word Wrap', 'Wrap long lines instead of scrolling sideways.'],
] as const

const ASSOC_DESC: Record<string, string> = {
  '.txt': 'Plain text notes',
  '.md': 'Markdown documents',
  '.log': 'Log files',
  '.json': 'Structured data',
  '.dat': 'Unknown binaries (examine)',
}

const PLUGINS = [
  { glyph: '⬡', name: 'Hex Inspector', desc: 'Examine odd-ball files byte by byte.', installed: true },
  { glyph: '◫', name: 'Format Sniffer', desc: "Guess a file's real type from its header.", installed: true },
  { glyph: '❡', name: 'Markdown Preview', desc: 'Render a leaf as formatted text.', installed: false },
]

function Preferences() {
  const section = useUiStore((s) => s.prefsSection)
  const s = useSettingsStore((st) => st.settings)
  const set = useSettingsStore.getState()
  const sectionLabel = PREF_SECTIONS.find(([k]) => k === section)?.[1] ?? ''

  return (
    <Overlay width={680} height={460} title="Preferences" pad={false}>
      <div className="of-dialog-split">
        <div className="of-dialog-nav prefs">
          {PREF_SECTIONS.map(([key, label]) => (
            <div
              key={key}
              className={'of-nav-item' + (section === key ? ' on' : '')}
              onClick={() => useUiStore.getState().setPrefsSection(key)}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="of-dialog-pane">
          <div className="of-sec-title">{sectionLabel}</div>

          {section === 'appearance' && (
            <>
              <div className="of-sub-label">Theme</div>
              <div className="of-pill-row gap22">
                {THEME_CHOICES.map(([t, label]) => (
                  <Pill key={t} on={s.theme === t} onClick={() => set.setTheme(t)}>
                    {label}
                  </Pill>
                ))}
              </div>
              <div className="of-form-row">
                <div className="of-form-label">Editor font</div>
                <div className="of-pill-row">
                  {FONT_CHOICES.map((f) => (
                    <Pill key={f} on={s.font === f} onClick={() => set.set('font', f)}>
                      {f.replace('IBM Plex ', '')}
                    </Pill>
                  ))}
                </div>
              </div>
              <div className="of-form-row">
                <div className="of-form-label">Font size</div>
                <input
                  className="of-slider"
                  type="range"
                  min={11}
                  max={22}
                  step={1}
                  value={s.fontSize}
                  onChange={(e) => set.set('fontSize', +e.target.value)}
                />
                <div className="of-slider-val">{s.fontSize}px</div>
              </div>
              <div className="of-form-row">
                <div className="of-form-label">Quick-search</div>
                <select
                  className="of-field"
                  style={{ width: 'auto' }}
                  value={s.searchEngine}
                  onChange={(e) => set.set('searchEngine', e.target.value as SearchEngine)}
                >
                  {ENGINES.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {section === 'editor' && (
            <div>
              {EDITOR_TOGGLES.map(([k, label, desc]) => (
                <ToggleRow key={k} on={s[k]} onClick={() => set.toggle(k)}>
                  <div className="of-toggle-text">
                    <div className="of-toggle-label">{label}</div>
                    <div className="of-toggle-desc">{desc}</div>
                  </div>
                </ToggleRow>
              ))}
            </div>
          )}

          {section === 'autosave' && (
            <>
              <div className="of-sub-label">Auto Save Interval</div>
              <div className="of-pill-row gap22">
                {INTERVALS.map(([val, l]) => (
                  <Pill key={val} on={s.autosaveInterval === val} onClick={() => set.set('autosaveInterval', val)}>
                    {l}
                  </Pill>
                ))}
              </div>
              <div className="of-sub-label">Autosave location</div>
              <div className="of-input-row">
                <input
                  className="of-field mono"
                  value={s.autosaveLocation}
                  onChange={(e) => set.set('autosaveLocation', e.target.value)}
                />
                <button
                  className="of-btn"
                  onClick={async () => {
                    const d = await getAdapter().chooseDirectory()
                    if (d) set.set('autosaveLocation', d)
                  }}
                >
                  Browse…
                </button>
              </div>
              <div className="of-hint note">
                Every open leaf is mirrored here continuously — nothing is ever lost between sessions.
              </div>
            </>
          )}

          {section === 'files' && (
            <>
              <div className="of-hint block">Choose which file types open in OpenFall by default.</div>
              {Object.keys(s.fileAssoc).map((ext) => (
                <ToggleRow key={ext} on={s.fileAssoc[ext]} onClick={() => set.setFileAssoc(ext, !s.fileAssoc[ext])}>
                  <span className="of-assoc-ext">{ext}</span>
                  <span className="of-assoc-desc">{ASSOC_DESC[ext] ?? ''}</span>
                </ToggleRow>
              ))}
              <ToggleRow
                on={Object.values(s.fileAssoc).every(Boolean)}
                onClick={() => set.setAllFileAssoc(!Object.values(s.fileAssoc).every(Boolean))}
              >
                <span className="of-assoc-ext" style={{ width: 'auto', color: 'var(--accent)', fontWeight: 600 }}>
                  Enable all
                </span>
                <span className="of-assoc-desc">Turn every listed file type on (or off).</span>
              </ToggleRow>
            </>
          )}

          {section === 'plugins' && (
            <>
              <div className="of-hint block">
                Extend OpenFall with examiners, exporters and views. More from the catalog soon.
              </div>
              {PLUGINS.map((p) => (
                <div key={p.name} className="of-plugin-row">
                  <div className="of-plugin-icon">{p.glyph}</div>
                  <div className="of-plugin-meta">
                    <div className="of-plugin-name">{p.name}</div>
                    <div className="of-plugin-desc">{p.desc}</div>
                  </div>
                  <button className={'of-btn' + (p.installed ? '' : ' primary')}>
                    {p.installed ? 'Installed' : 'Install'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Overlay>
  )
}

// ---------- Find & Transform ----------
const MODES: Array<[SearchMode, string]> = [
  ['search', 'Search'],
  ['files', 'Search in Files'],
  ['replace', 'Replace'],
  ['remove', 'Remove'],
  ['add', 'Add'],
]

const OPTS = [
  ['matchCase', 'Match case'],
  ['wholeWord', 'Whole word'],
  ['regex', 'Regex'],
] as const

interface FindCfg {
  blurb: string
  f1: string
  ph1: string
  f2?: string
  ph2?: string
  scope?: boolean
  buttons: string[]
}

const CFG: Record<SearchMode, FindCfg> = {
  search: {
    blurb: 'Find text within the current leaf.',
    f1: 'Find what',
    ph1: 'search term or /regex/',
    buttons: ['Count', 'Find All', 'Find Next'],
  },
  files: {
    blurb: 'Find text across every leaf and file in a folder.',
    f1: 'Find what',
    ph1: 'search term',
    scope: true,
    buttons: ['Find All in Files'],
  },
  replace: {
    blurb: 'Find text and replace it throughout the leaf.',
    f1: 'Find what',
    ph1: 'old text',
    f2: 'Replace with',
    ph2: 'new text',
    buttons: ['Replace', 'Replace All'],
  },
  remove: {
    blurb: 'Find text and strip every occurrence out.',
    f1: 'Remove all',
    ph1: 'text to delete',
    buttons: ['Count', 'Remove All'],
  },
  add: {
    blurb: 'Insert text on every line (or after each match).',
    f1: 'Anchor (match)',
    ph1: 'where to insert — blank = every line',
    f2: 'Text to add',
    ph2: 'inserted text',
    buttons: ['Add to All'],
  },
}

function FindTransform() {
  const mode = useUiStore((s) => s.searchMode)
  const query = useUiStore((s) => s.searchQuery)
  const opts = useUiStore((s) => s.searchOpts)
  const [replaceWith, setReplaceWith] = useState('')
  const [view, setView] = useState<'terminal' | 'list'>(useUiStore.getState().resultsView ?? 'terminal')
  const cfg = CFG[mode]

  const stripG = (re: RegExp) => new RegExp(re.source, re.flags.replace('g', ''))

  // Replace / Remove / Add operate on the active leaf's content (baseline logic).
  const transformActive = (fn: (content: string, re: RegExp) => string) => {
    const re = compileQuery(query, opts)
    const { leaves, activeLeafId } = useLeavesStore.getState()
    const leaf = leaves.find((l) => l.id === activeLeafId)
    if (!re || !leaf) return
    useLeavesStore.getState().editLeaf(leaf.id, fn(leaf.content, re))
    useUiStore.getState().closeDialog()
  }

  const actionFor = (label: string) => () => {
    // Search / Find-All / Find Next / Count / Find in Files → open the results panel.
    if (mode === 'search' || mode === 'files') {
      cmd.runSearch(view)
      return
    }
    if (mode === 'remove') {
      if (label === 'Count') cmd.runSearch(view)
      else transformActive((c, re) => c.replace(re, ''))
      return
    }
    if (mode === 'replace') {
      // "Replace" → first occurrence (non-global); "Replace All" → global.
      transformActive((c, re) => c.replace(label === 'Replace' ? stripG(re) : re, replaceWith))
      return
    }
    // add
    transformActive((c) => c.split('\n').map((l) => l + replaceWith).join('\n'))
  }

  return (
    <Overlay width={600} title="Find & Transform" pad={false}>
      <div className="of-dialog-split">
        <div className="of-dialog-nav find">
          {MODES.map(([m, label]) => (
            <div
              key={m}
              className={'of-nav-item' + (mode === m ? ' on' : '')}
              onClick={() => useUiStore.getState().setSearchMode(m)}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="of-dialog-pane find">
          <div className="of-hint block">{cfg.blurb}</div>

          <div className="of-field-group">
            <div className="of-field-label">{cfg.f1}</div>
            <input
              className="of-field mono"
              autoFocus
              value={query}
              placeholder={cfg.ph1}
              onChange={(e) => useUiStore.getState().setSearchQuery(e.target.value)}
            />
          </div>

          {cfg.f2 && (
            <div className="of-field-group">
              <div className="of-field-label">{cfg.f2}</div>
              <input
                className="of-field mono"
                value={replaceWith}
                placeholder={cfg.ph2}
                onChange={(e) => setReplaceWith(e.target.value)}
              />
            </div>
          )}

          {cfg.scope && (
            <div className="of-field-group">
              <div className="of-field-label">Folder</div>
              <input className="of-field mono" defaultValue="~/Journal/leaves" />
              <input className="of-field mono" defaultValue="*.txt, *.md, *.log, *.json" />
            </div>
          )}

          <div className="of-opts">
            {OPTS.map(([k, label]) => (
              <label key={k} className="of-opt">
                <input
                  type="checkbox"
                  checked={opts[k]}
                  onChange={(e) => useUiStore.getState().setSearchOpts({ [k]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {(mode === 'search' || mode === 'files') && (
            <div className="of-field-group">
              <div className="of-field-label">Results view</div>
              <div className="of-results-toggle">
                <button className={view === 'terminal' ? 'on' : ''} onClick={() => setView('terminal')}>Terminal</button>
                <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
              </div>
            </div>
          )}

          <div className="of-actions">
            {cfg.buttons.map((label, i) => (
              <button
                key={label}
                className={'of-btn' + (i === cfg.buttons.length - 1 ? ' primary' : '')}
                onClick={actionFor(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ---------- Export As ----------
function ExportAs() {
  const { leaves, activeLeafId } = useLeavesStore()
  const leaf = leaves.find((l) => l.id === activeLeafId)
  const run = async (format: ExportFormat) => {
    if (!leaf) return
    const r = convertLeaf(leaf, format)
    await getAdapter().exportFile({
      suggestedName: slugify(leaf.name),
      ext: r.ext,
      mime: r.mime,
      contents: r.text,
      needsPrint: r.needsPrint,
    })
    useUiStore.getState().closeDialog()
  }
  return (
    <Overlay width={480} title="Export As…">
      <div className="of-hint block">
        Convert '{leaf?.name ?? '—'}' to another format. Conversions are best-effort for the limited set below.
      </div>
      <div className="of-export-grid">
        {EXPORT_TARGETS.map((t) => (
          <button key={t.format} className="of-export-card" onClick={() => run(t.format)}>
            <span className="of-export-ext">{t.ext}</span>
            <span className="of-export-name">{t.label}</span>
          </button>
        ))}
      </div>
    </Overlay>
  )
}

// ---------- Auto Save Interval ----------
function Interval() {
  const v = useSettingsStore((s) => s.settings.autosaveInterval)
  return (
    <Overlay width={420} title="Auto Save Interval">
      <div className="of-hint block">How often should OpenFall commit every leaf to disk?</div>
      <div className="of-pill-row">
        {INTERVALS.map(([val, l]) => (
          <Pill key={val} on={v === val} onClick={() => useSettingsStore.getState().set('autosaveInterval', val)}>
            {l}
          </Pill>
        ))}
      </div>
    </Overlay>
  )
}

// ---------- Sort Leaves ----------
const SORT_BY: Array<[SortMode, string]> = [
  ['date', 'Date'],
  ['alpha', 'Name'],
  ['size', 'Size'],
  ['category', 'Category'],
]

function SortAdv() {
  const mode = useUiStore((s) => s.sortAdvMode)
  const dir = useUiStore((s) => s.sortAdvDir)
  const setSortAdv = useUiStore.getState().setSortAdv
  return (
    <Overlay width={520} title="Sort Leaves">
      <div className="of-sub-label">Sort by</div>
      <div className="of-pill-row gap22">
        {SORT_BY.map(([m, l]) => (
          <Pill key={m} on={mode === m} onClick={() => setSortAdv(m)}>
            {l}
          </Pill>
        ))}
      </div>
      <div className="of-sub-label">Direction</div>
      <div className="of-pill-row gap22">
        <Pill on={dir === 'asc'} onClick={() => setSortAdv(mode, 'asc')}>
          Ascending
        </Pill>
        <Pill on={dir === 'desc'} onClick={() => setSortAdv(mode, 'desc')}>
          Descending
        </Pill>
      </div>
      <div className="of-form-row">
        <div className="of-form-label">Then by</div>
        <input className="of-field mono" value="Category, then name" readOnly />
      </div>
      <div className="of-form-row">
        <div className="of-form-label">Apply to</div>
        <input className="of-field mono" value="Both rails (left & right)" readOnly />
      </div>
      <div className="of-actions" style={{ marginTop: 18 }}>
        <button className="of-btn" onClick={() => useUiStore.getState().closeDialog()}>
          Cancel
        </button>
        <button
          className="of-btn primary"
          onClick={() => {
            useLeavesStore.getState().sortAll(mode, dir)
            useUiStore.getState().closeDialog()
          }}
        >
          Apply sort
        </button>
      </div>
    </Overlay>
  )
}

// ---------- About ----------
function About() {
  return (
    <Overlay width={420} title="About OpenFall">
      <div className="of-about">
        <p>
          <strong>OpenFall</strong> — an autosaving digital journal &amp; odd-ball file examiner. Open source.
          Documents are <em>leaves</em>; everything autosaves; leaves self-name from their first words.
        </p>
        <p className="ver">Version 0.1.0</p>
      </div>
    </Overlay>
  )
}

// ---------- Keyboard Shortcuts ----------
const SHORTCUTS: Array<[string, string]> = [
  ['New Leaf', 'Ctrl+N'],
  ['Open', 'Ctrl+O'],
  ['Save', 'Ctrl+S'],
  ['Close Leaf', 'Ctrl+W'],
  ['Find', 'Ctrl+F'],
  ['Search in Files', 'Shift+Ctrl+F'],
  ['Replace', 'Ctrl+R'],
  ['Preferences', 'Ctrl+,'],
  ['Zoom In / Out', 'Ctrl+ + / −'],
]

function Shortcuts() {
  return (
    <Overlay width={420} title="Keyboard Shortcuts">
      {SHORTCUTS.map(([a, k]) => (
        <div key={a} className="of-shortcut-row">
          <span>{a}</span>
          <span className="of-shortcut-key">{k}</span>
        </div>
      ))}
    </Overlay>
  )
}

export function Dialogs() {
  const dialog = useUiStore((s) => s.dialog)
  switch (dialog) {
    case 'prefs':
      return <Preferences />
    case 'search':
      return <FindTransform />
    case 'export':
      return <ExportAs />
    case 'interval':
      return <Interval />
    case 'sortadv':
      return <SortAdv />
    case 'about':
      return <About />
    case 'shortcuts':
      return <Shortcuts />
    default:
      return null
  }
}
