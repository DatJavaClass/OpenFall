// OpenFall — verify web layout: solid backdrop + reclaimed width, with Other View.
import { chromium } from 'playwright'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const width = Number(process.argv[3] || 1100)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width, height: 720 }, deviceScaleFactor: 2 })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5173', { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)
await p.screenshot({ path: dir + 'openfall-web-default.png' })
await p.click('[title="Enable Other View"]')
await p.waitForTimeout(400)
await p.screenshot({ path: dir + 'openfall-web-otherview.png' })
const bodyW = await p.evaluate(() => Math.round(document.querySelector('.of-window').getBoundingClientRect().width))
console.log(`viewport ${width} → body width ${bodyW}px`, errs.length ? 'ERRORS: ' + errs.join('; ') : '(no errors)')
await b.close()
