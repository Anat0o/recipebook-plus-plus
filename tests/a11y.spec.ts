/**
 * Пиксельное оформление не должно стоить доступности.
 *
 * Стилистика поменялась на игровую, но поведение осталось прежним: зоны
 * нажатия не меньше 44 pt, у элементов есть роли, а «Уменьшение движения»
 * и «Понижение прозрачности» действительно всё останавливают.
 */
import { expect, test } from '@playwright/test'

/** Минимальная зона нажатия. */
const TAP = 44

test('элементы управления сохраняют зоны нажатия и роли', async ({ page }) => {
  await page.goto('./26.2/item/wither_skeleton_skull')

  // Роли остались машиночитаемыми, хотя выглядят элементы как GUI игры.
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('switch')).toBeVisible()
  await expect(dialog.getByRole('slider').first()).toBeVisible()
  await expect(dialog.getByRole('tablist')).toBeVisible()

  const targets = [
    dialog.getByRole('switch'),
    dialog.getByRole('tab').first(),
    page.getByRole('button', { name: 'Каталог', exact: true }),
  ]

  for (const target of targets) {
    const box = await target.boundingBox()
    expect(box).not.toBeNull()
    // У переключателя зона добирается псевдоэлементом, поэтому меряем и её.
    const hit = await target.evaluate((element) => {
      const style = getComputedStyle(element, '::before')
      const rect = element.getBoundingClientRect()
      const inset = Number.parseFloat(style.inset) || 0
      return { width: rect.width - inset * 2, height: rect.height - inset * 2 }
    })
    expect(Math.max(box!.height, hit.height)).toBeGreaterThanOrEqual(TAP - 0.5)
  }
})

test('при «Уменьшении движения» анимации замирают, а содержимое остаётся', async ({ page }) => {
  // Эмуляцию включаем явно: так проверка не зависит от настроек проекта.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./26.2/station/loom')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Готовые баннеры')
  await expect(dialog.locator('.banner__layer').first()).toBeVisible()

  const state = await page.evaluate(() => {
    const durations = [...document.querySelectorAll('*')]
      .map((element) => getComputedStyle(element).animationDuration)
      .filter((value) => value !== '0s')
    return {
      applied: matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Единицы разные, поэтому переводим всё в миллисекунды.
      longestMs: Math.max(
        0,
        ...durations.map((value) =>
          value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000,
        ),
      ),
      animated: durations.length,
    }
  })

  expect(state.applied).toBe(true)
  // Анимации на странице есть, но каждая длится мгновение.
  expect(state.animated).toBeGreaterThan(0)
  expect(state.longestMs).toBeLessThanOrEqual(1)

  // Баннеры при этом видны, а не остаются прозрачными навсегда.
  const opacity = await dialog
    .locator('.banner__layer')
    .first()
    .evaluate((element) => getComputedStyle(element).opacity)
  expect(Number(opacity)).toBe(1)
})

test('при «Понижении прозрачности» фон остаётся читаемым', async ({ page, context }) => {
  // У Playwright нет отдельной настройки для этого признака, но у браузера она есть —
  // включаем её напрямую через протокол, чтобы проверка была настоящей.
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  })
  await page.goto('./')

  const applied = await page.evaluate(
    () => matchMedia('(prefers-reduced-transparency: reduce)').matches,
  )
  expect(applied).toBe(true)
  const veil = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue('--mc-tile-veil').trim(),
  )
  // Полупрозрачная вуаль заменяется плотным цветом страницы.
  expect(veil).not.toContain('rgb(0 0 0 /')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('поиск и переходы работают с клавиатуры', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('searchbox').fill('алмаз')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.className ?? '')
  expect(focused).toContain('search-field__clear')
})

test('модальный лист удерживает и возвращает фокус', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('searchbox').fill('алмаз')
  const opener = page.locator('.item-row').first()
  await opener.focus()
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const focusables = dialog.locator('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
  const last = focusables.last()
  await last.focus()
  await page.keyboard.press('Tab')
  await expect(focusables.first()).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('пять вкладок помещаются на ширине 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('./')
  const tabs = page.locator('.tab-bar button')
  await expect(tabs).toHaveCount(5)
  const fits = await page.locator('.tab-bar').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  expect(fits).toBe(true)
})
