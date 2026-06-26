// OpenFall — dev screenshot helper for visual verification / regression.
// Usage: node scripts/shot.mjs [url] [outPath] [waitMs]
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://localhost:5173'
const out = process.argv[3] || 'openfall-shot.png'
const waitMs = Number(process.argv[4] || 900)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + (e.stack || e.message)))

await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => logs.push('GOTO: ' + e.message))
const hasWindow = await page.waitForSelector('.of-window', { timeout: 6000 }).then(() => true).catch(() => false)
await page.waitForTimeout(waitMs)
await page.screenshot({ path: out })

console.log('shot saved:', out, '| .of-window present:', hasWindow)
const errs = logs.filter((l) => l.startsWith('PAGEERROR') || l.startsWith('[error]') || l.startsWith('GOTO'))
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors; logs:\n' + logs.slice(0, 10).join('\n'))
await browser.close()
