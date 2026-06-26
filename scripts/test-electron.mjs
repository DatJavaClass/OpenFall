// Verify the desktop app (launch electron with --remote-debugging-port=9222 first):
// resize grips actually resize the OS window, + categories/theme/Separate work.
import { chromium } from 'playwright'
const browser = await chromium.connectOverCDP('http://localhost:9222')
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().startsWith('app://')) || ctx.pages()[0]
await page.waitForSelector('.of-window', { timeout: 10000 })
await page.waitForTimeout(900)

// RESIZE via the right-edge grip
const b0 = await page.evaluate(() => window.openfall.getBounds())
const grip = await page.$('.of-resize.e')
let b1 = b0
if (grip) {
  const box = await grip.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  b1 = await page.evaluate(() => window.openfall.getBounds())
}

// CATEGORIES dropdown
await page.click('[title="Categories"]')
await page.waitForTimeout(250)
const catItems = await page.evaluate(() => document.querySelectorAll('.of-tb-dropdown .of-menu-item').length)
await page.keyboard.press('Escape')
await page.waitForTimeout(150)

// THEME cycle
const t0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
await page.click('.of-theme-toggle')
await page.waitForTimeout(150)
const t1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

// SEPARATE opens a real OS window
const before = browser.contexts()[0].pages().length
await page.click('[title="Separate View"]')
await page.waitForTimeout(1500)
const after = browser.contexts()[0].pages().length

console.log('resize: grip', !!grip, '| width', Math.round(b0.width), '→', Math.round(b1.width), '| resized:', b1.width > b0.width + 80)
console.log('categories items:', catItems, '| theme', t0, '→', t1)
console.log('windows before Separate:', before, '→ after:', after, '| opened a real window:', after > before)
await browser.close()
