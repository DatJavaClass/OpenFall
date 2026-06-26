// OpenFall — editor pane: header (+ code legend), synced line-number gutter,
// ruled-paper textarea, and the read-only syntax-highlighted code examiner.
import { useEffect, useRef } from 'react'
import type { CSSProperties, UIEvent } from 'react'
import { useLeavesStore } from '../state/leavesStore'
import { useSettingsStore } from '../state/settingsStore'
import { useUiStore } from '../state/uiStore'
import { kindOf, isCodeLeaf, looksLikeCode } from '../lib/leafName'
import { tokenizeJS, TOKEN_VAR } from '../lib/tokenizeJS'
import { HighlightEditor } from './HighlightEditor'
import { WebLeaf } from './WebLeaf'
import type { Leaf } from '../types'

export interface Caret {
  ln: number
  col: number
}

const LEGEND: Array<[string, string]> = [
  ['keyword', TOKEN_VAR.keyword],
  ['string', TOKEN_VAR.string],
  ['number', TOKEN_VAR.number],
  ['function', TOKEN_VAR.function],
  ['object', TOKEN_VAR.property],
  ['comment', TOKEN_VAR.comment],
]

function caretOf(value: string, pos: number): Caret {
  const upto = value.slice(0, pos)
  const ln = (upto.match(/\n/g)?.length ?? 0) + 1
  const col = pos - (upto.lastIndexOf('\n') + 1) + 1
  return { ln, col }
}

export function EditorPane({
  leaf,
  isOther = false,
  onCaret,
  style,
}: {
  leaf: Leaf
  isOther?: boolean
  onCaret?: (c: Caret) => void
  style?: CSSProperties
}) {
  const settings = useSettingsStore((s) => s.settings)
  const gutterInner = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const lastOffsetRef = useRef(0)
  const prev = useRef({ id: '', detected: false })

  const named = isCodeLeaf(leaf.name) // .js/.ts → read-only examiner
  // A leaf is treated as (editable) code when its category is Code/Script OR its
  // content looks like code. Setting the category is the reliable manual override.
  const byCategory = leaf.category === 'Code' || leaf.category === 'Script'
  const detected = !named && (byCategory || looksLikeCode(leaf.content))
  const code = named || detected
  const kind = kindOf(leaf.name)
  const lineCount = Math.max(1, (leaf.content.match(/\n/g)?.length ?? 0) + 1)
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')

  const syncGutter = (e: UIEvent<HTMLElement>) => {
    if (gutterInner.current) gutterInner.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`
  }
  const syncTop = (top: number) => {
    if (gutterInner.current) gutterInner.current.style.transform = `translateY(${-top}px)`
  }

  // Preserve focus + caret when a leaf swaps between the plain and highlight
  // editors as its content crosses the code-detection threshold.
  useEffect(() => {
    if (prev.current.id === leaf.id && prev.current.detected !== detected) {
      const ta = bodyRef.current?.querySelector('textarea')
      if (ta) {
        ta.focus()
        const pos = Math.min(lastOffsetRef.current, ta.value.length)
        ta.setSelectionRange(pos, pos)
      }
    }
    prev.current = { id: leaf.id, detected }
  }, [leaf.id, detected])

  const fontStyle = { fontSize: settings.fontSize, lineHeight: 1.7 }

  if (leaf.url) return <WebLeaf leaf={leaf} isOther={isOther} />

  return (
    <div className="of-pane" style={style} onMouseDown={() => useUiStore.getState().setFocusedLeaf(leaf.id)}>
      <div className="of-pane-header">
        <span className="of-pane-dot" style={isOther ? { background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined} />
        {isOther && <span style={{ color: 'var(--muted)' }}>Other View ·</span>}
        <span style={{ color: 'var(--text)' }}>{leaf.name}</span>
        <span className="of-pane-kind">· {detected ? (byCategory ? 'code' : 'code (detected)') : kind.mime}</span>
        {code && (
          <span className="of-legend">
            {LEGEND.map(([label, color]) => (
              <span key={label}>
                <i style={{ background: color }} />
                {label}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="of-pane-body" ref={bodyRef}>
        {settings.showLineNumbers && (
          <div className="of-gutter" style={fontStyle}>
            <div ref={gutterInner}>{lineNumbers}</div>
          </div>
        )}

        {named ? (
          <div className="of-scroll" onScroll={syncGutter}>
            <div className="of-codeview" style={fontStyle}>
              {tokenizeJS(leaf.content).map((t, i) => (
                <span key={i} style={{ color: TOKEN_VAR[t.kind], fontStyle: t.italic ? 'italic' : 'normal' }}>
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        ) : detected ? (
          <HighlightEditor
            leaf={leaf}
            settings={settings}
            onCaret={onCaret}
            onScrollTop={syncTop}
            onOffset={(n) => {
              lastOffsetRef.current = n
            }}
          />
        ) : (
          <textarea
            className={'of-textarea ' + (settings.wrap ? 'wrap' : 'nowrap')}
            style={{ ...fontStyle, fontFamily: settings.font }}
            value={leaf.content}
            spellCheck={settings.spellcheck}
            placeholder="Begin a leaf — its first words become its name…"
            onScroll={syncGutter}
            onChange={(e) => {
              useLeavesStore.getState().editLeaf(leaf.id, e.target.value)
              lastOffsetRef.current = e.target.selectionStart
              onCaret?.(caretOf(e.target.value, e.target.selectionStart))
            }}
            onKeyUp={(e) => {
              lastOffsetRef.current = e.currentTarget.selectionStart
              onCaret?.(caretOf(e.currentTarget.value, e.currentTarget.selectionStart))
            }}
            onClick={(e) => {
              lastOffsetRef.current = e.currentTarget.selectionStart
              onCaret?.(caretOf(e.currentTarget.value, e.currentTarget.selectionStart))
            }}
            onSelect={(e) => {
              lastOffsetRef.current = e.currentTarget.selectionStart
              onCaret?.(caretOf(e.currentTarget.value, e.currentTarget.selectionStart))
            }}
          />
        )}
      </div>
    </div>
  )
}
