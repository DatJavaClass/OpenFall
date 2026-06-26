// OpenFall — persisted settings (theme, fonts, autosave, toggles, file assoc).
import { create } from 'zustand'
import type { Settings, ThemeChoice } from '../types'
import { DEFAULT_SETTINGS } from '../lib/seed'

type ToggleKey = 'otherView' | 'showLineNumbers' | 'wrap' | 'spellcheck'

interface SettingsState {
  settings: Settings
  set<K extends keyof Settings>(key: K, value: Settings[K]): void
  setTheme(theme: ThemeChoice): void
  toggle(key: ToggleKey): void
  setFileAssoc(ext: string, on: boolean): void
  setAllFileAssoc(on: boolean): void
  zoom(delta: number): void
  replace(settings: Settings): void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS, fileAssoc: { ...DEFAULT_SETTINGS.fileAssoc } },
  set: (key, value) => set((st) => ({ settings: { ...st.settings, [key]: value } })),
  setTheme: (theme) => set((st) => ({ settings: { ...st.settings, theme } })),
  toggle: (key) => set((st) => ({ settings: { ...st.settings, [key]: !st.settings[key] } })),
  setFileAssoc: (ext, on) =>
    set((st) => ({ settings: { ...st.settings, fileAssoc: { ...st.settings.fileAssoc, [ext]: on } } })),
  setAllFileAssoc: (on) =>
    set((st) => ({
      settings: {
        ...st.settings,
        fileAssoc: Object.fromEntries(Object.keys(st.settings.fileAssoc).map((k) => [k, on])),
      },
    })),
  zoom: (delta) =>
    set((st) => ({
      settings: { ...st.settings, fontSize: Math.max(11, Math.min(22, st.settings.fontSize + delta)) },
    })),
  replace: (settings) => set({ settings }),
}))
