// OpenFall — screenshot the Preferences + Find & Transform dialogs (dev server up).
// node scripts/shot-dialogs.mjs [outDir]
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
await p.waitForTimeout(600)

await p.keyboard.press('Control+,')
await p.waitForSelector('.of-dialog')
await p.waitForTimeout(300)
await p.screenshot({ path: dir + 'openfall-prefs.png' })

// switch to the Editor section to show the toggle switches
await p.click('.of-dialog-nav .of-nav-item:has-text("Editor")')
await p.waitForTimeout(250)
await p.screenshot({ path: dir + 'openfall-prefs-editor.png' })
await p.keyboard.press('Escape')

await p.click('[title="Find & Transform"]')
await p.waitForSelector('.of-dialog')
await p.waitForTimeout(300)
await p.screenshot({ path: dir + 'openfall-find.png' })

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors — 3 dialog shots saved')
await b.close()
