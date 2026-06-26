// OpenFall — attach to a running Electron app over CDP and screenshot it.
// Launch the app with --remote-debugging-port=9222 first, then run this.
// node scripts/shot-electron.mjs [cdpUrl] [outPath]
import { chromium } from 'playwright'

const cdp = process.argv[2] || 'http://localhost:9222'
const out = process.argv[3] || 'openfall-electron.png'

const browser = await chromium.connectOverCDP(cdp)
const ctx = browser.contexts()[0]
let page = ctx.pages().find((p) => !p.url().startsWith('devtools://'))
if (!page) page = await ctx.waitForEvent('page')
await page.waitForSelector('.of-window', { timeout: 8000 }).catch(() => {})
await page.waitForTimeout(1200)
await page.screenshot({ path: out, omitBackground: true })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
console.log('electron shot saved:', out, '| url:', page.url())
await browser.close() // disconnects CDP; does NOT kill the Electron app
