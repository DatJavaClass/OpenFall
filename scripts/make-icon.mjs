// OpenFall — render the app icon (brass "OF" wordmark) to build/icon.png at 512px
// using headless Chromium. electron-builder auto-detects build/icon.png.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#cf9a45"/>
      <stop offset="1" stop-color="#8a6020"/>
    </linearGradient>
  </defs>
  <rect x="36" y="36" width="440" height="440" rx="108" fill="url(#g)"/>
  <text x="256" y="278" font-family="'IBM Plex Sans', Arial, sans-serif" font-weight="700"
        font-size="212" fill="#1a1611" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="-6">OF</text>
</svg>`

mkdirSync('build', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
await page.waitForTimeout(150)
await page.screenshot({ path: 'build/icon.png', omitBackground: true })
console.log('icon written: build/icon.png')
await browser.close()
