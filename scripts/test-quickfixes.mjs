// Verify: Categories dropdown opens (not clipped) + theme label cycles.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

await p.click('[title="Categories"]')
await p.waitForTimeout(300)
const catVisible = await p.evaluate(() => {
  const d = document.querySelector('.of-tb-dropdown')
  if (!d) return false
  const r = d.getBoundingClientRect()
  return r.height > 4 && r.bottom <= window.innerHeight + 2 && getComputedStyle(d).visibility !== 'hidden'
})
const catItems = await p.evaluate(() => document.querySelectorAll('.of-tb-dropdown .of-menu-item').length)
await p.screenshot({ path: dir + 'openfall-categories.png' })

await p.click('.of-title-app')
await p.waitForTimeout(200)
const t0 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
await p.click('.of-theme-toggle')
await p.waitForTimeout(200)
const t1 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
await p.click('.of-theme-toggle')
await p.waitForTimeout(200)
const label2 = await p.evaluate(() => document.querySelector('.of-theme-toggle')?.textContent?.trim())

console.log('categories dropdown visible:', catVisible, '| items:', catItems)
console.log('theme cycle: data-theme', t0, '→', t1, '| after 2 clicks label =', JSON.stringify(label2))
console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no errors')
await b.close()
