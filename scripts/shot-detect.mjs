// OpenFall — verify content code-detection + editable highlighting (dev server up).
// Types multi-line JS into a fresh leaf and checks nothing drops across the swap.
import { chromium } from 'playwright'

const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

await p.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')

const code = [
  'function unfold(door, depth) {',
  '  if (depth <= 0) return null;',
  "  const next = { door: door + 1, seen: false };",
  '  return unfold(next, depth - 1);',
  '}',
].join('\n')
await p.keyboard.type(code, { delay: 25 })
await p.waitForTimeout(700)

const val = await p.evaluate(() => {
  const t = document.querySelector('.of-hl-ta') || document.querySelector('.of-textarea')
  return t ? t.value : '(none)'
})
const detected = await p.evaluate(() => document.body.innerText.includes('code (detected)'))
await p.screenshot({ path: dir + 'openfall-detect.png' })

console.log('typed len:', code.length, '| readback len:', val.length, '| match:', val === code, '| header detected:', detected)
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors')
await b.close()
