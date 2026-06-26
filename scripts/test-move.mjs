// Verify the multi-window MOVE model on the portable file:// client:
// Separate moves a leaf OUT of the main rails (no duplicate); Rejoin returns it.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1200, height: 780 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('main: ' + e.message))
const railCount = (pg) => pg.evaluate(() => document.querySelectorAll('.of-leaf .name').length)

await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)
const before = await railCount(p)

const [popup] = await Promise.all([ctx.waitForEvent('page'), p.click('[title="Separate View"]')])
popup.on('pageerror', (e) => errs.push('popup: ' + e.message))
await popup.waitForSelector('.of-window-sep')
await popup.waitForTimeout(900)
const popupLeaf = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const afterSeparate = await railCount(p)

await popup.click('button[title="Return this leaf to the main window"]')
await p.waitForTimeout(900)
const afterRejoin = await railCount(p)

console.log('main rail leaves — before:', before, '| after Separate:', afterSeparate, '| after Rejoin:', afterRejoin)
console.log('popup showed:', JSON.stringify(popupLeaf))
console.log('moved out (no duplicate):', afterSeparate === before - 1)
console.log('restored on rejoin:', afterRejoin === before)
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors')
await b.close()
