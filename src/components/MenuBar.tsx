// OpenFall — menu bar: File · Search · Edit · View · Preferences · Plugins · ?
import { useSettingsStore } from '../state/settingsStore'
import { useUiStore } from '../state/uiStore'
import { cmd } from '../commands'

interface Item {
  label?: string
  shortcut?: string
  tick?: boolean
  divider?: boolean
  onClick?: () => void
}
interface Menu {
  key: string
  label: string
  items: Item[]
}

const DIV: Item = { divider: true }

export function MenuBar() {
  const s = useSettingsStore((st) => st.settings)
  const activeMenu = useUiStore((st) => st.activeMenu)
  const toggleMenu = useUiStore((st) => st.toggleMenu)
  const noop = () => useUiStore.getState().closeMenus()

  const menus: Menu[] = [
    {
      key: 'file',
      label: 'File',
      items: [
        { label: 'New Leaf', shortcut: 'Ctrl+N', onClick: cmd.newLeaf },
        { label: 'Open…', shortcut: 'Ctrl+O', onClick: cmd.openLeaf },
        DIV,
        { label: 'Save', shortcut: 'Ctrl+S', onClick: cmd.save },
        { label: 'Save As…', shortcut: 'Shift+Ctrl+S', onClick: cmd.save },
        { label: 'Auto Save Interval…', onClick: cmd.intervalDialog },
        { label: 'Export As…', onClick: cmd.exportDialog },
        { label: 'Print…', shortcut: 'Ctrl+P', onClick: cmd.print },
        DIV,
        { label: 'Close Leaf', shortcut: 'Ctrl+W', onClick: cmd.closeActive },
        { label: 'Exit', onClick: cmd.exit },
      ],
    },
    {
      key: 'search',
      label: 'Search',
      items: [
        { label: 'Search', shortcut: 'Ctrl+F', onClick: () => cmd.openSearch('search') },
        { label: 'Search in Files', shortcut: 'Shift+Ctrl+F', onClick: () => cmd.openSearch('files') },
        DIV,
        { label: 'Replace', shortcut: 'Ctrl+R', onClick: () => cmd.openSearch('replace') },
        { label: 'Remove', onClick: () => cmd.openSearch('remove') },
        { label: 'Add', onClick: () => cmd.openSearch('add') },
      ],
    },
    {
      key: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => cmd.edit('undo') },
        { label: 'Redo', shortcut: 'Shift+Ctrl+Z', onClick: () => cmd.edit('redo') },
        DIV,
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => cmd.edit('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => cmd.edit('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => cmd.edit('paste') },
        DIV,
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => cmd.edit('selectAll') },
      ],
    },
    {
      key: 'view',
      label: 'View',
      items: [
        { label: 'Enable Other View', tick: s.otherView, onClick: () => cmd.toggle('otherView') },
        DIV,
        { label: 'Show Line Numbers', tick: s.showLineNumbers, onClick: () => cmd.toggle('showLineNumbers') },
        { label: 'Word Wrap', tick: s.wrap, onClick: () => cmd.toggle('wrap') },
        DIV,
        { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => cmd.zoom(1) },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => cmd.zoom(-1) },
      ],
    },
    {
      key: 'prefs',
      label: 'Preferences',
      items: [
        { label: 'Open Preferences…', shortcut: 'Ctrl+,', onClick: cmd.preferences },
        DIV,
        { label: 'Dark Mode', tick: s.theme === 'dark', onClick: () => cmd.setTheme('dark') },
        { label: 'Light Mode', tick: s.theme === 'light', onClick: () => cmd.setTheme('light') },
        { label: 'Match System', tick: s.theme === 'system', onClick: () => cmd.setTheme('system') },
        DIV,
        { label: 'Enable Other View', tick: s.otherView, onClick: () => cmd.toggle('otherView') },
      ],
    },
    {
      key: 'plugins',
      label: 'Plugins',
      items: [
        {
          label: 'Plugin Manager…',
          onClick: () => {
            useUiStore.getState().setPrefsSection('plugins')
            cmd.preferences()
          },
        },
        DIV,
        { label: 'Hex Inspector', tick: true, onClick: noop },
        { label: 'Format Sniffer', tick: true, onClick: noop },
        { label: 'Markdown Preview', onClick: noop },
        DIV,
        { label: 'Browse catalog…', onClick: noop },
      ],
    },
    {
      key: 'help',
      label: '?',
      items: [
        { label: 'About OpenFall', onClick: cmd.about },
        { label: 'Keyboard Shortcuts', onClick: cmd.shortcuts },
      ],
    },
  ]

  return (
    <div className="of-menubar">
      {menus.map((m) => (
        <div
          key={m.key}
          className={'of-menu' + (activeMenu === m.key ? ' open' : '')}
          onClick={(e) => {
            e.stopPropagation()
            toggleMenu(m.key)
          }}
        >
          {m.label}
          {activeMenu === m.key && (
            <div className="of-dropdown" onClick={(e) => e.stopPropagation()}>
              {m.items.map((it, i) =>
                it.divider ? (
                  <div key={i} className="of-menu-divider" />
                ) : (
                  <div key={i} className="of-menu-item" onClick={it.onClick}>
                    <span className="tick">{it.tick ? '✓' : ''}</span>
                    <span className="label">{it.label}</span>
                    {it.shortcut && <span className="shortcut">{it.shortcut}</span>}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
