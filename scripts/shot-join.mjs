// OpenFall — verify Join View (web): open a Separate window, then from the main
// window send a different leaf to it; the separate window should switch to it.
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

// 1) Separate the active leaf into popup A.
const [popup] = await Promise.all([ctx.waitForEvent('page'), p.click('[title="Separate View"]')])
popup.on('pageerror', (e) => errs.push('popup: ' + e.message))
await popup.waitForSelector('.of-window-sep')
await popup.waitForTimeout(500)
const before = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)

// 2) In main, make a distinct new leaf and save it.
await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')
await p.keyboard.type('JOINED-LEAF-CONTENT-XYZ', { delay: 8 })
await p.keyboard.press('Control+s')
await p.waitForTimeout(500)

// 3) Open Join dropdown, send current leaf to the popup.
await p.click('[title="Join View"]')
await p.waitForTimeout(500)
await p.click('.of-tb-dropdown .of-menu-item')
await popup.waitForTimeout(700)

const after = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const content = await popup.evaluate(() => {
  const t = document.querySelector('.of-hl-ta') || document.querySelector('.of-textarea')
  return t ? t.value : '(none)'
})
await popup.screenshot({ path: dir + 'openfall-join.png' })
console.log('popup before join:', JSON.stringify(before))
console.log('popup after join: ', JSON.stringify(after))
console.log('popup shows joined content:', content.includes('JOINED-LEAF-CONTENT-XYZ'))
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors')
await b.close()
