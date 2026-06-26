// Prove the solo pane fills at ANY window size (no hardcoded width) + that the
// Script category (not just Code) drives code coloring.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } })
const p = await ctx.newPage()
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

// close down to EXACTLY one leaf, enable Other View
for (let guard = 0; guard < 14; guard++) {
  const n = await p.evaluate(() => document.querySelectorAll('.of-leaf').length)
  if (n <= 1) break
  await p.keyboard.press('Control+w')
  await p.waitForTimeout(120)
}
await p.click('[title="Enable Other View"]')
await p.waitForTimeout(300)
const measure = () =>
  p.evaluate(() => {
    const a = document.querySelector('.of-editor-area')?.getBoundingClientRect().width ?? 0
    const pane = document.querySelector('.of-editor-area .of-pane')?.getBoundingClientRect().width ?? 0
    return { area: Math.round(a), pane: Math.round(pane) }
  })
const sizes = {}
for (const w of [1000, 1500, 760]) {
  await p.setViewportSize({ width: w, height: 760 })
  await p.waitForTimeout(300)
  const m = await measure()
  sizes[w] = { ...m, fills: m.pane > m.area - 30 }
}

// Script category drives code coloring
await p.setViewportSize({ width: 1200, height: 800 })
await p.waitForTimeout(200)
await p.keyboard.press('Control+n')
await p.waitForTimeout(250)
await p.click('.of-textarea')
await p.keyboard.type('a normal sentence about nothing in particular', { delay: 6 })
await p.waitForTimeout(300)
const before = await p.evaluate(() => document.querySelector('.of-pane-kind')?.textContent?.trim())
await p.click('[title="Categories"]')
await p.waitForTimeout(300)
await p.click('.of-tb-dropdown .of-menu-item:has-text("Script")')
await p.waitForTimeout(400)
const after = await p.evaluate(() => document.querySelector('.of-pane-kind')?.textContent?.trim())
const isHighlight = await p.evaluate(() => !!document.querySelector('.of-hl-ta'))

console.log('solo pane fills (area vs pane width), at three window sizes:')
for (const w of [1000, 1500, 760]) console.log(`  ${w}px →`, sizes[w])
console.log('Script category:', JSON.stringify(before), '→', JSON.stringify(after), '| highlight editor:', isHighlight)
await b.close()
