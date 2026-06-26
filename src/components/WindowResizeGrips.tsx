// OpenFall — resize grips for the frameless desktop window. The OS window's real
// edges sit out in the transparent margin (so the ribbons can overhang), which
// makes them awkward to grab. These thin grips ride the VISIBLE body edges and
// drive the OS window bounds via IPC. Electron only — the browser resizes itself.
import type { MouseEvent as ReactMouseEvent } from 'react'
import { getAdapter, isElectron } from '../platform/adapter'

type Edge = 'e' | 'w' | 's' | 'se' | 'sw'
const MIN_W = 420
const MIN_H = 300

export function WindowResizeGrips() {
  if (!isElectron()) return null

  const start = (edge: Edge) => async (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const adapter = getAdapter()
    const b0 = await adapter.getBounds()
    if (!b0) return
    const sx = e.screenX
    const sy = e.screenY
    const move = (ev: MouseEvent) => {
      const dx = ev.screenX - sx
      const dy = ev.screenY - sy
      let { x, width, height } = b0
      const y = b0.y
      if (edge.includes('e')) width = Math.max(MIN_W, b0.width + dx)
      if (edge.includes('s')) height = Math.max(MIN_H, b0.height + dy)
      if (edge.includes('w')) {
        const nw = Math.max(MIN_W, b0.width - dx)
        x = b0.x + (b0.width - nw)
        width = nw
      }
      adapter.setBounds({ x, y, width, height })
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <>
      <div className="of-resize w" onMouseDown={start('w')} />
      <div className="of-resize e" onMouseDown={start('e')} />
      <div className="of-resize s" onMouseDown={start('s')} />
      <div className="of-resize sw" onMouseDown={start('sw')} />
      <div className="of-resize se" onMouseDown={start('se')} />
    </>
  )
}
