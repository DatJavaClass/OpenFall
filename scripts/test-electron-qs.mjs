import { chromium } from 'playwright'
const browser = await chromium.connectOverCDP('http://localhost:9222')
const ctx = browser.contexts()[0]
const page = ctx.pages().find((p) => p.url().startsWith('app://')) || ctx.pages()[0]
await page.waitForSelector('.of-window', { timeout: 10000 })
await page.waitForTimeout(800)
await page.click('.of-quicksearch')
await page.fill('.of-quicksearch', 'w3schools css flexbox')
await page.keyboard.press('Enter')
await page.waitForTimeout(1800)
const leafName = await page.evaluate(() => document.querySelector('.of-title-leafname')?.textContent)
const present = await page.evaluate(() => !!document.querySelector('.of-webview'))
const src = await page.evaluate(() => document.querySelector('.of-webview')?.getAttribute('src'))
console.log('electron quick search → leaf:', JSON.stringify(leafName))
console.log('  <webview> embedded:', present, '| src:', src)
await browser.close()
