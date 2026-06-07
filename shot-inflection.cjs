const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const wait = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' })

  // Tap through preloader, wait for hero reveal + initTimeline
  await wait(2500)
  await page.keyboard.press('Enter')
  await page.mouse.click(640, 400)
  await wait(6000)

  // Scroll naturally (drives Lenis) until #inflection is roughly centered
  await page.mouse.move(640, 400)
  for (let i = 0; i < 60; i++) {
    const r = await page.evaluate(() => {
      const b = document.getElementById('inflection').getBoundingClientRect()
      return { top: b.top, ih: window.innerHeight }
    })
    if (r.top <= r.ih * 0.05) break
    await page.mouse.wheel({ deltaY: 320 })
    await wait(110)
  }
  await wait(2500) // let the word stagger + flash finish

  await page.screenshot({ path: 'inflection.png' })
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
