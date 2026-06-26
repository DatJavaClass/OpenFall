// Verify: window reflows with viewport width + Other-View divider is draggable.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 2 })
const p = await ctx.newPage()
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)

const winW = () => p.evaluate(() => Math.round(document.querySelector('.of-window').getBoundingClientRect().width))
const w1200 = await winW()
await p.setViewportSize({ width: 900, height: 780 })
await p.waitForTimeout(300)
const w900 = await winW()
await p.setViewportSize({ width: 1200, height: 780 })
await p.waitForTimeout(300)

await p.click('[title="Enable Other View"]')
await p.waitForTimeout(400)
const panes = () => p.evaluate(() => Array.from(document.querySelectorAll('.of-editor-area .of-pane')).map((e) => Math.round(e.getBoundingClientRect().width)))
const before = await panes()

const box = await (await p.$('.of-divider-drag')).boundingBox()
await p.mouse.move(box.x + 2, box.y + box.height / 2)
await p.mouse.down()
await p.mouse.move(box.x - 160, box.y + box.height / 2, { steps: 10 })
await p.mouse.up()
await p.waitForTimeout(300)
const after = await panes()
await p.screenshot({ path: dir + 'openfall-divider.png' })

console.log('window reflow: 1200vp →', w1200, 'px | 900vp →', w900, 'px (reflows:', w900 < w1200, ')')
console.log('panes before drag:', before, '| after drag left 160px:', after)
console.log('divider draggable:', after[0] < before[0] - 60)
await b.close()
