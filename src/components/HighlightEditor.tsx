// OpenFall — editable syntax-highlighting editor. A transparent <textarea> sits
// over a tokenized <pre> overlay (kept scroll-synced), so you can WRITE code/notes
// and see live highlighting. Used for content-detected code leaves (named .js/.ts
// leaves still use the read-only examiner). The two layers share identical box
// metrics so the highlight lines up exactly with what you type.
import { useRef } from 'react'
import type { UIEvent } from 'react'
import { useLeavesStore } from '../state/leavesStore'
import { tokenizeJS, TOKEN_VAR } from '../lib/tokenizeJS'
import type { Leaf, Settings } from '../types'
import type { Caret } from './EditorPane'

function caretOf(ta: HTMLTextAreaElement): Caret {
  const upto = ta.value.slice(0, ta.selectionStart)
  return {
    ln: (upto.match(/\n/g)?.length ?? 0) + 1,
    col: ta.selectionStart - (upto.lastIndexOf('\n') + 1) + 1,
  }
}

export function HighlightEditor({
  leaf,
  settings,
  onCaret,
  onScrollTop,
  onOffset,
}: {
  leaf: Leaf
  settings: Settings
  onCaret?: (c: Caret) => void
  onScrollTop?: (top: number) => void
  /** Reports the caret's character offset (so the pane can restore it on a swap). */
  onOffset?: (offset: number) => void
}) {
  const preRef = useRef<HTMLPreElement>(null)

  const report = (ta: HTMLTextAreaElement) => {
    onCaret?.(caretOf(ta))
    onOffset?.(ta.selectionStart)
  }
  const sync = (e: UIEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget
    if (preRef.current) {
      preRef.current.scrollTop = t.scrollTop
      preRef.current.scrollLeft = t.scrollLeft
    }
    onScrollTop?.(t.scrollTop)
  }

  const wrapCls = settings.wrap ? 'wrap' : 'nowrap'
  const fontStyle = { fontSize: settings.fontSize, lineHeight: 1.7 }
  const tokens = tokenizeJS(leaf.content)

  return (
    <div className="of-hl">
      <pre ref={preRef} className={'of-hl-layer of-hl-pre ' + wrapCls} style={fontStyle} aria-hidden="true">
        {tokens.map((t, i) => (
          <span key={i} style={{ color: TOKEN_VAR[t.kind], fontStyle: t.italic ? 'italic' : 'normal' }}>
            {t.text}
          </span>
        ))}
        {'\n'}
      </pre>
      <textarea
        className={'of-hl-layer of-hl-ta ' + wrapCls}
        style={fontStyle}
        value={leaf.content}
        spellCheck={false}
        onScroll={sync}
        onChange={(e) => {
          useLeavesStore.getState().editLeaf(leaf.id, e.target.value)
          report(e.currentTarget)
        }}
        onKeyUp={(e) => report(e.currentTarget)}
        onClick={(e) => report(e.currentTarget)}
        onSelect={(e) => report(e.currentTarget)}
      />
    </div>
  )
}
