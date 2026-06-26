// Does Separate View open a window when the portable client runs from file://?
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

let popup = null
try {
  ;[popup] = await Promise.all([
    ctx.waitForEvent('page', { timeout: 4000 }),
    p.click('[title="Separate View"]'),
  ])
} catch {
  /* no popup */
}

if (popup) {
  await popup.waitForTimeout(800)
  const name = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent).catch(() => '(err)')
  console.log('RESULT: popup OPENED from file://, leaf =', JSON.stringify(name))
} else {
  console.log('RESULT: Separate View did NOT open a window from file:// (browser popup restriction)')
}
console.log('main errors:', errs.length ? errs.join('; ') : 'none')
await b.close()
