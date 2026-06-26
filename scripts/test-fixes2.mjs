// Verify: single-line code detection, Categories dropdown assign, and Separate
// acting on the FOCUSED (Other-View secondary) pane — on the portable file://.
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

// 1) single-line code detection
await p.keyboard.press('Control+n')
await p.waitForSelector('.of-textarea')
await p.click('.of-textarea')
await p.keyboard.type('let total = items.length;', { delay: 15 })
await p.waitForTimeout(500)
const detected = await p.evaluate(() => document.body.innerText.includes('code (detected)'))

// 2) Categories dropdown assigns to the current (new, uncategorized) leaf
await p.keyboard.press('Control+n')
await p.waitForTimeout(300)
const dotsBefore = await p.evaluate(() => document.querySelectorAll('.of-leaf .cat-dot').length)
await p.click('[title="Categories"]')
await p.waitForTimeout(300)
await p.click('.of-tb-dropdown .of-menu-item:has-text("Code")')
await p.waitForTimeout(300)
const dotsAfter = await p.evaluate(() => document.querySelectorAll('.of-leaf .cat-dot').length)

// 3) Separate acts on the focused secondary pane
await p.click('[title="Enable Other View"]')
await p.waitForTimeout(400)
const panes = await p.$$('.of-editor-area .of-pane')
const secName = panes[1] ? await panes[1].$eval('.of-pane-header', (h) => h.textContent.trim()) : '(none)'
if (panes[1]) await panes[1].click({ position: { x: 60, y: 6 } })
await p.waitForTimeout(200)
const [popup] = await Promise.all([ctx.waitForEvent('page'), p.click('[title="Separate View"]')])
await popup.waitForSelector('.of-window-sep')
await popup.waitForTimeout(700)
const popupName = await popup.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const mainPanes = await p.evaluate(() => Array.from(document.querySelectorAll('.of-editor-area .of-pane .of-pane-header')).map((h) => h.textContent.trim()))

console.log('1) single-line code detected:', detected)
console.log('2) cat dots:', dotsBefore, '→', dotsAfter, '| assigned:', dotsAfter === dotsBefore + 1)
console.log('3) secondary pane:', JSON.stringify(secName))
console.log('   separated popup leaf:', JSON.stringify(popupName), '| matches secondary:', !!popupName && secName.includes(popupName))
console.log('   main panes after:', mainPanes, '| duplicated:', mainPanes.length === 2 && mainPanes[0] === mainPanes[1])
console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no errors')
await b.close()
