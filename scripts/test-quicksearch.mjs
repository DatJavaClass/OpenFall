// Verify the Quick Search bar: typing + Enter opens a web leaf and the results.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)
await p.screenshot({ path: dir + 'openfall-toolbar-qs.png' })
const hasInput = await p.evaluate(() => !!document.querySelector('.of-quicksearch'))

await p.click('.of-quicksearch')
await p.fill('.of-quicksearch', 'thesaurus synonyms')
const [popup] = await Promise.all([
  ctx.waitForEvent('page').catch(() => null),
  p.keyboard.press('Enter'),
])
await p.waitForTimeout(600)
const leafName = await p.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const webFallback = await p.evaluate(() => !!document.querySelector('.of-web-fallback'))
const popupUrl = popup ? popup.url() : '(no popup)'
await p.screenshot({ path: dir + 'openfall-webleaf.png' })

console.log('quick-search input present:', hasInput)
console.log('after search → active leaf:', JSON.stringify(leafName))
console.log('web fallback shown:', webFallback)
console.log('opened url:', popupUrl)
console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no errors')
await b.close()
