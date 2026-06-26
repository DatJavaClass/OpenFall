// OpenFall — status bar: kind, counts, Ln/Col, leaves open, encoding, theme.
import { useLeavesStore } from '../state/leavesStore'
import { useSettingsStore } from '../state/settingsStore'
import { kindOf } from '../lib/leafName'
import { resolveTheme } from '../theme/applyTheme'
import type { ThemeChoice } from '../types'

export interface Caret {
  ln: number
  col: number
}

const themeLabel: Record<ThemeChoice, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export function StatusBar({ caret }: { caret: Caret }) {
  const { leaves, activeLeafId } = useLeavesStore()
  const theme = useSettingsStore((s) => s.settings.theme)
  const active = leaves.find((l) => l.id === activeLeafId)
  const content = active?.content ?? ''
  const kind = kindOf(active?.name ?? '')
  const chars = content.length
  const lines = content.length ? content.split('\n').length : 0

  const order: ThemeChoice[] = ['dark', 'light', 'system']
  const cycleTheme = () => useSettingsStore.getState().setTheme(order[(order.indexOf(theme) + 1) % order.length])

  return (
    <div className="of-statusbar">
      <span>{kind.label}</span>
      <span>
        {chars} chars · {lines} lines
      </span>
      <span>
        Ln {caret.ln}, Col {caret.col}
      </span>
      <span className="of-status-spacer" />
      <span>{leaves.length} leaves open</span>
      <span>Windows (CRLF)</span>
      <span>UTF-8</span>
      <span
        className="of-status-accent of-theme-toggle"
        title="Click to cycle theme — Dark · Light · System"
        onClick={cycleTheme}
      >
        {themeLabel[theme]}{theme === 'system' ? ` · ${resolveTheme(theme) === 'light' ? 'Light' : 'Dark'}` : ''}
      </span>
    </div>
  )
}
