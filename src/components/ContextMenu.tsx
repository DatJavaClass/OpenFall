// OpenFall — right-click-a-leaf context menu. The ONLY way to assign a category.
import { useLeavesStore } from '../state/leavesStore'
import { useUiStore } from '../state/uiStore'
import { PALETTE } from '../lib/seed'

export function ContextMenu() {
  const ctx = useUiStore((s) => s.ctxMenu)
  const { leaves, categories } = useLeavesStore()
  if (!ctx) return null
  const leaf = leaves.find((l) => l.id === ctx.id)
  if (!leaf) return null

  const assign = (name: string | null) => {
    useLeavesStore.getState().assignCategory(ctx.id, name)
    useUiStore.getState().closeCtx()
  }

  return (
    <div
      className="of-ctx"
      style={{ left: Math.min(ctx.x, window.innerWidth - 210), top: Math.min(ctx.y, window.innerHeight - 240) }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="of-ctx-head">Assign category</div>
      {categories.map((c) => (
        <div key={c.name} className="of-menu-item" onClick={() => assign(c.name)}>
          <span className="cat-dot" style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
          <span className="label">{c.name}</span>
          {leaf.category === c.name && <span>✓</span>}
        </div>
      ))}
      <div className="of-menu-divider" />
      <div className="of-menu-item" onClick={() => assign(null)}>
        <span className="label">Clear category</span>
      </div>
      <div
        className="of-menu-item"
        onClick={() => {
          const color = PALETTE[categories.length % PALETTE.length]
          const name = `Category ${categories.length + 1}`
          useLeavesStore.getState().addCategory(name, color)
          assign(name)
        }}
      >
        <span className="label">＋ Add new…</span>
      </div>
    </div>
  )
}
