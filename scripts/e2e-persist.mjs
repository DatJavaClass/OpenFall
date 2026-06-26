// OpenFall — end-to-end autosave/restart check against the packaged Electron app.
// Launch OpenFall.exe with --remote-debugging-port=9222, then:
//   node scripts/e2e-persist.mjs write  <marker>   # new leaf, type marker, Ctrl+S
//   node scripts/e2e-persist.mjs verify <marker>   # after restart: is the marker present?
import { chromium } from 'playwright'

const mode = process.argv[2] || 'verify'
const marker = process.argv[3] || 'PERSIST-TEST-ABC123'
const browser = await chromium.connectOverCDP('http://localhost:9222')
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().startsWith('app://')) || ctx.pages()[0]
await page.waitForSelector('.of-window', { timeout: 10000 })
await page.waitForTimeout(800)

if (mode === 'write') {
  await page.keyboard.press('Control+n') // new (text) leaf → empty textarea, active
  await page.waitForTimeout(500)
  const ta = await page.waitForSelector('.of-textarea', { timeout: 5000 })
  await ta.click()
  await page.keyboard.type(marker)
  await page.waitForTimeout(500)
  await page.keyboard.press('Control+s') // explicit save → IPC → fs
  await page.waitForTimeout(1800)
  console.log('WRITE complete')
} else {
  const found = await page.evaluate(
    (m) =>
      Array.from(document.querySelectorAll('textarea')).some((t) => t.value.includes(m)) ||
      document.body.innerText.includes(m),
    marker,
  )
  console.log('VERIFY:', found ? 'FOUND' : 'NOT-FOUND')
}
await browser.close()
