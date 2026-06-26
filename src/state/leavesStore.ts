// OpenFall — leaves (open documents), active selection, and categories.
import { create } from 'zustand'
import type { Category, Leaf, SortDirection, SortMode } from '../types'
import { deriveLeafName, nextSide } from '../lib/leafName'
import { makeLeaf } from '../lib/seed'
import { sortLeaves } from '../lib/search'

interface LeavesState {
  leaves: Leaf[]
  activeLeafId: string | null
  categories: Category[]
  /** Create a new empty leaf on the lighter rail and select it; returns its id. */
  newLeaf(): string
  /** Add a leaf from opened file content; returns its id. */
  addLeaf(name: string, content: string): string
  /** Add a web (Quick Search) leaf showing a URL; returns its id. */
  addWebLeaf(name: string, url: string): string
  closeLeaf(id: string): void
  selectLeaf(id: string): void
  editLeaf(id: string, content: string): void
  renameLeaf(id: string, name: string): void
  assignCategory(id: string, category: string | null): void
  addCategory(name: string, color: string): void
  sortAll(mode: SortMode, direction?: SortDirection): void
  replace(data: { leaves: Leaf[]; activeLeafId: string | null; categories: Category[] }): void
}

export const useLeavesStore = create<LeavesState>((set, get) => ({
  leaves: [],
  activeLeafId: null,
  categories: [],

  newLeaf: () => {
    const leaf = makeLeaf(nextSide(get().leaves))
    set((st) => ({ leaves: [...st.leaves, leaf], activeLeafId: leaf.id }))
    return leaf.id
  },

  addLeaf: (name, content) => {
    const base = makeLeaf(nextSide(get().leaves))
    const leaf: Leaf = { ...base, name: name || base.name, content, custom: true }
    set((st) => ({ leaves: [...st.leaves, leaf], activeLeafId: leaf.id }))
    return leaf.id
  },

  addWebLeaf: (name, url) => {
    const base = makeLeaf(nextSide(get().leaves))
    const leaf: Leaf = { ...base, name, content: '', custom: true, url }
    set((st) => ({ leaves: [...st.leaves, leaf], activeLeafId: leaf.id }))
    return leaf.id
  },

  closeLeaf: (id) =>
    set((st) => {
      const idx = st.leaves.findIndex((l) => l.id === id)
      const leaves = st.leaves.filter((l) => l.id !== id)
      let activeLeafId = st.activeLeafId
      if (st.activeLeafId === id) {
        activeLeafId = leaves.length ? leaves[Math.min(idx, leaves.length - 1)]?.id ?? leaves[0].id : null
      }
      return { leaves, activeLeafId }
    }),

  selectLeaf: (id) => set({ activeLeafId: id }),

  editLeaf: (id, content) =>
    set((st) => ({
      leaves: st.leaves.map((l) =>
        l.id === id ? { ...l, content, name: l.custom ? l.name : deriveLeafName(content) } : l,
      ),
    })),

  renameLeaf: (id, name) =>
    set((st) => ({
      leaves: st.leaves.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name, custom: true } : l)),
    })),

  assignCategory: (id, category) =>
    set((st) => ({ leaves: st.leaves.map((l) => (l.id === id ? { ...l, category } : l)) })),

  addCategory: (name, color) =>
    set((st) =>
      st.categories.some((c) => c.name === name) ? st : { categories: [...st.categories, { name, color }] },
    ),

  sortAll: (mode, direction) => set((st) => ({ leaves: sortLeaves(st.leaves, mode, direction) })),

  replace: (data) =>
    set({ leaves: data.leaves, activeLeafId: data.activeLeafId, categories: data.categories }),
}))

/** Selector helper: the currently active leaf (or undefined). */
export function activeLeaf(): Leaf | undefined {
  const { leaves, activeLeafId } = useLeavesStore.getState()
  return leaves.find((l) => l.id === activeLeafId)
}
