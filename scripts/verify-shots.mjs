// OpenFall — scripted visual verification of search results + light theme.
// Run with the dev server up: node scripts/verify-shots.mjs [outDir]
import { chromium } from 'playwright'

const url = 'http://localhost:5173'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

await p.goto(url, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(700)

await p.click('[title="Find & Transform"]')
await p.waitForSelector('.of-dialog')
await p.fill('.of-field', 'door')
await p.click('button:has-text("Find All")')
await p.waitForTimeout(500)
await p.screenshot({ path: dir + 'openfall-search-terminal.png' })

await p.click('.of-results-toggle button:has-text("List")')
await p.waitForTimeout(300)
await p.screenshot({ path: dir + 'openfall-search-list.png' })

await p.click('.of-list .of-dialog-x')
await p.keyboard.press('Control+,')
await p.waitForSelector('.of-dialog')
await p.click('.of-pill:has-text("Light")')
await p.waitForTimeout(300)
await p.click('.of-dialog-x')
await p.waitForTimeout(300)
await p.screenshot({ path: dir + 'openfall-light.png' })

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors — 3 shots saved')
await b.close()
