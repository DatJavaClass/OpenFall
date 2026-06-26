import { describe, it, expect } from 'vitest'
import { convertLeaf, markdownToHtml, slugify, EXPORT_TARGETS } from '../src/lib/export'
import type { Leaf } from '../src/types'

const mk = (over: Partial<Leaf> = {}): Leaf => ({
  id: 'id',
  side: 'left',
  name: 'My Leaf',
  custom: false,
  content: '',
  category: null,
  created: 0,
  ...over,
})
const target = (f: string) => EXPORT_TARGETS.find((t) => t.format === f)!

describe('convertLeaf', () => {
  it('txt: passes content through, needsPrint false, matching mime/ext', () => {
    const r = convertLeaf(mk({ content: 'hello\nworld' }), 'txt')
    expect(r.text).toBe('hello\nworld')
    expect(r.needsPrint).toBe(false)
    expect(r.mime).toBe(target('txt').mime)
    expect(r.ext).toBe(target('txt').ext)
  })

  it('md: passes content through, needsPrint false, matching mime/ext', () => {
    const r = convertLeaf(mk({ content: '# Title' }), 'md')
    expect(r.text).toBe('# Title')
    expect(r.needsPrint).toBe(false)
    expect(r.mime).toBe(target('md').mime)
    expect(r.ext).toBe(target('md').ext)
  })

  it('json: emits valid JSON containing name & content', () => {
    const r = convertLeaf(mk({ name: 'Note', content: 'body text' }), 'json')
    expect(r.needsPrint).toBe(false)
    const parsed = JSON.parse(r.text)
    expect(parsed.name).toBe('Note')
    expect(parsed.content).toBe('body text')
    expect(r.mime).toBe(target('json').mime)
    expect(r.ext).toBe(target('json').ext)
  })

  it('rtf: starts with {\\rtf1 and maps newlines to \\par', () => {
    const r = convertLeaf(mk({ content: 'a\nb' }), 'rtf')
    expect(r.text.startsWith('{\\rtf1')).toBe(true)
    expect(r.text).toContain('\\par')
    expect(r.needsPrint).toBe(false)
    expect(r.mime).toBe(target('rtf').mime)
    expect(r.ext).toBe(target('rtf').ext)
  })

  it('html: renders the content, needsPrint false', () => {
    const r = convertLeaf(mk({ name: 'Doc', content: '# Heading' }), 'html')
    expect(r.text).toContain('<!doctype html>')
    expect(r.text).toContain('<h1>Heading</h1>')
    expect(r.needsPrint).toBe(false)
    expect(r.mime).toBe(target('html').mime)
    expect(r.ext).toBe(target('html').ext)
  })

  it('pdf: needsPrint true and returns the printable HTML', () => {
    const r = convertLeaf(mk({ name: 'Doc', content: '# Heading' }), 'pdf')
    expect(r.needsPrint).toBe(true)
    expect(r.text).toContain('<!doctype html>')
    expect(r.text).toContain('<h1>Heading</h1>')
    expect(r.mime).toBe(target('pdf').mime)
    expect(r.ext).toBe(target('pdf').ext)
  })
})

describe('markdownToHtml', () => {
  it('renders ATX headings at the right level', () => {
    expect(markdownToHtml('# H')).toBe('<h1>H</h1>')
    expect(markdownToHtml('### Three')).toBe('<h3>Three</h3>')
  })

  it('renders **bold** as <strong>', () => {
    expect(markdownToHtml('**b**')).toContain('<strong>b</strong>')
  })

  it('renders `code` as <code>', () => {
    expect(markdownToHtml('`c`')).toContain('<code>c</code>')
  })

  it('renders "- item" as <li> inside a <ul>', () => {
    const html = markdownToHtml('- item')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>item</li>')
    expect(html).toContain('</ul>')
  })

  it('renders a [text](url) link as an anchor', () => {
    expect(markdownToHtml('[t](u)')).toContain('<a href="u">t</a>')
  })

  it('HTML-escapes "<" in plain text', () => {
    expect(markdownToHtml('a < b')).toContain('a &lt; b')
  })
})

describe('slugify', () => {
  it('replaces whitespace runs with hyphens', () => {
    expect(slugify('my note name')).toBe('my-note-name')
  })

  it('strips unsafe characters, keeping word chars / dot / hyphen', () => {
    expect(slugify('Hello, World!.txt')).toBe('Hello-World.txt')
    expect(slugify('a_b-c.d')).toBe('a_b-c.d')
  })

  it('falls back to "leaf" for an empty name', () => {
    expect(slugify('')).toBe('leaf')
  })

  it('falls back to "leaf" when every character is stripped', () => {
    expect(slugify('***')).toBe('leaf')
  })

  it('caps the slug at 60 characters', () => {
    expect(slugify('a'.repeat(70))).toHaveLength(60)
  })
})
