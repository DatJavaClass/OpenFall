// Verify: brace-less script detection, category-drives-code, solo-pane fill.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)
const kind = () => p.evaluate(() => document.querySelector('.of-pane-kind')?.textContent?.trim())

// 1) brace-less script detection
await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')
await p.keyboard.type('import math\nstring name\nint count\ndouble value\nfor x', { delay: 12 })
await p.waitForTimeout(500)
const scriptKind = await kind()

// 2) category drives code: plain note → assign Code → should become code
await p.keyboard.press('Control+n')
await p.waitForTimeout(250)
await p.click('.of-textarea')
await p.keyboard.type('just a plain note about my day, nothing special', { delay: 6 })
await p.waitForTimeout(300)
const beforeCat = await kind()
await p.click('[title="Categories"]')
await p.waitForTimeout(300)
await p.click('.of-tb-dropdown .of-menu-item:has-text("Code")')
await p.waitForTimeout(400)
const afterCat = await kind()
const isHighlight = await p.evaluate(() => !!document.querySelector('.of-hl-ta'))

// 3) solo fill: close down to one leaf, enable Other View, primary should fill
for (let i = 0; i < 8; i++) {
  await p.keyboard.press('Control+w')
  await p.waitForTimeout(120)
}
await p.click('[title="Enable Other View"]')
await p.waitForTimeout(300)
const layout = await p.evaluate(() => {
  const area = document.querySelector('.of-editor-area')?.getBoundingClientRect().width ?? 0
  const panes = document.querySelectorAll('.of-editor-area .of-pane')
  return { area: Math.round(area), paneCount: panes.length, pane0: panes[0] ? Math.round(panes[0].getBoundingClientRect().width) : 0 }
})

console.log('1) brace-less script kind:', JSON.stringify(scriptKind))
console.log('2) plain note before:', JSON.stringify(beforeCat), '→ after assign Code:', JSON.stringify(afterCat), '| highlight editor:', isHighlight)
console.log('3) one-leaf Other View:', JSON.stringify(layout), '| primary fills:', layout.paneCount === 1 && layout.pane0 > layout.area - 30)
console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no errors')
await b.close()
