// Full multi-window test on the PORTABLE file:// client: Separate View + Join View
// + cross-window registry (storage-event bus).
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1100, height: 740 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('main: ' + e.message))

await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

const [popup] = await Promise.all([ctx.waitForEvent('page'), p.click('[title="Separate View"]')])
popup.on('pageerror', (e) => errs.push('popup: ' + e.message))
await popup.waitForSelector('.of-window-sep')
await popup.waitForTimeout(500)
const before = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)

await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')
await p.keyboard.type('PORTABLE-JOIN-XYZ', { delay: 8 })
await p.keyboard.press('Control+s')
await p.waitForTimeout(700)

await p.click('[title="Join View"]')
await p.waitForTimeout(700)
const items = await p.evaluate(() => document.querySelectorAll('.of-tb-dropdown .of-menu-item').length)
await p.click('.of-tb-dropdown .of-menu-item').catch(() => {})
await popup.waitForTimeout(900)

const after = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const content = await popup.evaluate(() => {
  const t = document.querySelector('.of-hl-ta') || document.querySelector('.of-textarea')
  return t ? t.value : '(none)'
})
console.log('separate opened, leaf before join:', JSON.stringify(before))
console.log('join dropdown peer items:', items)
console.log('popup leaf after join:', JSON.stringify(after))
console.log('popup shows joined content:', content.includes('PORTABLE-JOIN-XYZ'))
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors')
await b.close()
