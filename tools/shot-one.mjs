/** Снимок одной страницы: node tools/shot-one.mjs <путь> <файл> [dark|light] */
import { chromium } from '@playwright/test'
const [, , path, out, scheme = 'dark'] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 402, height: 874 }, deviceScaleFactor: 2,
  locale: 'ru-RU', colorScheme: scheme, isMobile: true, hasTouch: true,
})
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(`http://localhost:4173/recipebook-plus-plus/${path}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' })
console.log(errors.length ? 'ОШИБКИ: ' + errors.join(' | ') : 'ошибок нет')
await browser.close()
