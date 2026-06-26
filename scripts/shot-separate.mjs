// OpenFall — verify Separate View (web): the ⧉ button pops the active leaf into
// its own window that shares the same store.
import { chromium } from 'playwright'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('main: ' + e.message))

await p.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')
await p.keyboard.type('Hello from the OpenFall main window', { delay: 10 })
await p.keyboard.press('Control+s')
await p.waitForTimeout(400)

const [popup] = await Promise.all([ctx.waitForEvent('page'), p.click('[title="Separate View"]')])
popup.on('pageerror', (e) => errs.push('popup: ' + e.message))
await popup.waitForSelector('.of-window-sep', { timeout: 8000 })
await popup.waitForTimeout(800)
await popup.screenshot({ path: dir + 'openfall-separate.png' })

const name = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const content = await popup.evaluate(() => {
  const t = document.querySelector('.of-hl-ta') || document.querySelector('.of-textarea')
  return t ? t.value : '(none)'
})
console.log('popup leaf name:', JSON.stringify(name))
console.log('popup shares main content:', content.includes('Hello from the OpenFall main window'))
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors')
await b.close()
