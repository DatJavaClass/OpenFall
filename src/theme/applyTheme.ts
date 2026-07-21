// Theme resolution; "system" follows prefers-color-scheme.
import type { ResolvedTheme, ThemeChoice } from '../types'

export function resolveTheme(theme: ThemeChoice): ResolvedTheme {
  if (theme === 'system') {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: light)') : null
    return mq?.matches ? 'light' : 'dark'
  }
  return theme
}

export function applyTheme(theme: ThemeChoice): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}

/** Re-apply on OS change while choice is "system". */
export function watchSystemTheme(getTheme: () => ThemeChoice): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => {
    if (getTheme() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
