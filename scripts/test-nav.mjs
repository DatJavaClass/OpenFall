import { chromium } from 'playwright'
const file = 'file:///C:/Users/victo/Dropbox/Working/Projects/OpenFall/dist-portable/index.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
const p = await ctx.newPage()
await p.goto(file, { waitUntil: 'networkidle' })
await p.waitForSelector('.of-window')
await p.waitForTimeout(600)
const name = () => p.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const seq = [await name()]
for (const k of ['Alt+ArrowUp', 'Alt+ArrowUp', 'Alt+ArrowLeft', 'Alt+ArrowDown', 'Alt+ArrowRight']) {
  await p.keyboard.press(k)
  await p.waitForTimeout(160)
  seq.push(`${k}=${await name()}`)
}
console.log('nav sequence:', JSON.stringify(seq, null, 0))
await b.close()
