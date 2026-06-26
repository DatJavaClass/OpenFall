// Verify: wider leaves, leaf-nav shortcut, file-types list + Enable all.
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
await p.screenshot({ path: dir + 'openfall-wider.png' })

// ribbon width
const ribbonW = await p.evaluate(() => Math.round(document.querySelector('.of-leaf')?.getBoundingClientRect().width ?? 0))

// leaf nav: Alt+ArrowDown changes the active leaf
const active0 = await p.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
await p.keyboard.press('Alt+ArrowDown')
await p.waitForTimeout(200)
const active1 = await p.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
await p.keyboard.press('Alt+ArrowRight')
await p.waitForTimeout(200)
const active2 = await p.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)

// preferences → File Associations
await p.keyboard.press('Control+,')
await p.waitForSelector('.of-dialog')
await p.click('.of-nav-item:has-text("File Associations")')
await p.waitForTimeout(300)
const assocCount = await p.evaluate(() => document.querySelectorAll('.of-assoc-ext').length)
const hasEnableAll = await p.evaluate(() => Array.from(document.querySelectorAll('.of-assoc-ext')).some((e) => e.textContent.trim() === 'Enable all'))
const hasPluginsTesting = await p.evaluate(() => Array.from(document.querySelectorAll('.of-nav-item')).some((e) => e.textContent.includes('Plugins (Testing)')))
await p.screenshot({ path: dir + 'openfall-fileassoc.png' })

console.log('ribbon width (web):', ribbonW, 'px')
console.log('leaf nav: active', JSON.stringify(active0), '→ Alt+Down', JSON.stringify(active1), '→ Alt+Right', JSON.stringify(active2))
console.log('file-assoc rows:', assocCount, '| Enable all present:', hasEnableAll, '| Plugins (Testing):', hasPluginsTesting)
console.log(errs.length ? 'ERRORS: ' + errs.join('; ') : 'no errors')
await b.close()
