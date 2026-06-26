// OpenFall — title bar: logo, active-leaf name, app name, window controls.
import { useLeavesStore } from '../state/leavesStore'
import { getAdapter } from '../platform/adapter'

export function TitleBar() {
  const { leaves, activeLeafId } = useLeavesStore()
  const active = leaves.find((l) => l.id === activeLeafId)
  const name = active?.name ?? 'OpenFall'
  const ctl = (action: 'minimize' | 'maximize' | 'close') => () => getAdapter().windowControl(action)

  return (
    <div className="of-titlebar">
      <div className="of-logo">OF</div>
      <div className="of-title-leafname">{name}</div>
      <div className="of-title-app">OpenFall</div>
      <div className="of-title-spacer" />
      <div className="of-win-btns">
        <button className="of-win-btn" title="Minimize" onClick={ctl('minimize')}>
          &#8212;
        </button>
        <button className="of-win-btn" title="Maximize" onClick={ctl('maximize')}>
          &#9633;
        </button>
        <button className="of-win-btn of-close" title="Close" onClick={ctl('close')}>
          &#10005;
        </button>
      </div>
    </div>
  )
}
