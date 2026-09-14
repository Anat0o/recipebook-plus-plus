/**
 * Снимки экранов для глазами-проверки вёрстки.
 * Запуск: node tools/screenshots.mjs <папка> (сайт должен быть собран и запущен на 4173)
 */
import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'screenshots'
const base = 'http://localhost:4173/recipebook-plus-plus/'

// Без программного растеризатора 3D-схемы в headless остаются пустыми.
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
for (const scheme of ['dark', 'light']) {
  const page = await browser.newPage({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    colorScheme: scheme,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${out}/${scheme}-1-search.png` })

  await page.getByRole('searchbox').fill('алмаз')
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}/${scheme}-2-results.png` })

  await page.goto(`${base}26.2/item/wither_skeleton_skull`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${scheme}-3-skull.png` })

  await page.goto(`${base}26.2/item/diamond_pickaxe`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${scheme}-4-pickaxe.png` })

  await page.goto(`${base}26.2/station/brewing_stand`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${scheme}-6-brewing.png` })

  await page.goto(`${base}26.2/station/enchanting_table`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${scheme}-7-enchanting.png` })

  await page.goto(`${base}26.2/station/loom`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${scheme}-8-loom.png` })

  await page.getByRole('button', { name: /Крипер/ }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${scheme}-9-loom-steps.png`, fullPage: true })

  await page.goto(`${base}26.2/station/smithing_table`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${scheme}-14-smithing.png`, fullPage: true })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${scheme}-10-farms.png` })

  await page.getByRole('button', { name: /Ферма тростника/ }).click()
  await page.waitForTimeout(1500)
  await page.locator('.build3d').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${scheme}-11-farm-guide.png` })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Редстоун', exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${scheme}-12-redstone.png` })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Настройки', exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${scheme}-13-settings.png`, fullPage: true })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Жители', exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${scheme}-15-villagers.png`, fullPage: true })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Каталог' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${scheme}-5-catalog.png` })
  await page.close()
}
await browser.close()
console.log('снимки записаны в', out)
