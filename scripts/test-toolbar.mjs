// Check the Spell toggle and Quick Search input don't overlap at narrow widths.
import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const dir = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/')
const b = await chromium.launch()
const p = await (await b.newContext({ deviceScaleFactor: 2 })).newPage()
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
for (const w of [1100, 980, 860]) {
  await p.setViewportSize({ width: w, height: 760 })
  await p.waitForTimeout(300)
  const r = await p.evaluate(() => {
    const spell = Array.from(document.querySelectorAll('.of-tb-btn')).find((b) => b.textContent.includes('Spell'))
    const qs = document.querySelector('.of-quicksearch')
    const save = document.querySelector('.of-save')
    const body = document.querySelector('.of-window').getBoundingClientRect()
    return {
      spellR: spell ? Math.round(spell.getBoundingClientRect().right) : 0,
      qsL: qs ? Math.round(qs.getBoundingClientRect().left) : 0,
      qsW: qs ? Math.round(qs.getBoundingClientRect().width) : 0,
      saveR: save ? Math.round(save.getBoundingClientRect().right) : 0,
      bodyR: Math.round(body.right),
    }
  })
  console.log(`vp ${w}:`, r, '| no overlap:', r.spellR <= r.qsL, '| save fits:', r.saveR <= r.bodyR + 2)
  await p.screenshot({ path: dir + `openfall-tb-${w}.png` })
}
await b.close()
