/**
 * Установка на телефон и оффлайн-режим.
 *
 * Проверка сквозная нарочно: сервис-воркер легко «работает» на бумаге и
 * молча отдаёт пустую страницу — поймать это можно только по-настоящему
 * оборвав сеть и открыв адрес, которого браузер ещё не видел.
 */
import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'allow' })

test('загруженная версия открывается без сети', async ({ page, context }) => {
  await page.goto('./')
  // Ждём, пока воркер возьмёт страницу под контроль.
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 })
    .toBe(true)

  await page.getByRole('button', { name: 'Настройки', exact: true }).click()
  // Предупреждение о вытеснении данных должно быть видно до загрузки.
  await expect(page.getByText(/вытесняют|evict/i)).toBeVisible()

  await page.getByRole('button', { name: /Загрузить версию/ }).click()
  await expect(page.getByRole('button', { name: /Загружено/ })).toBeVisible({ timeout: 120000 })

  const cachedPaths = await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith('recipebook-data-'))
    if (!key) return []
    return (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)
  })
  expect(cachedPaths.length).toBeGreaterThan(60)
  expect(cachedPaths.some((path) => path.endsWith('/villagers.json'))).toBe(true)
  expect(cachedPaths.some((path) => path.endsWith('/stations.json'))).toBe(true)
  expect(cachedPaths.some((path) => path.endsWith('/blocks.json'))).toBe(true)
  expect(cachedPaths.some((path) => path.endsWith('/blocks.png'))).toBe(true)
  expect(cachedPaths.some((path) => path.endsWith('/armor-trims.json'))).toBe(true)
  expect(cachedPaths.some((path) => path.endsWith('/armor-sets.png'))).toBe(true)

  // Рвём сеть и открываем адрес, которого браузер ещё не открывал.
  await context.setOffline(true)
  await page.goto('./26.2/item/diamond')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Алмаз', { timeout: 15000 })
  await expect(dialog).toContainText('Верстак')
  // Иконки берутся из атласа: если он не закэширован, тут будет пусто.
  await expect(dialog.locator('.mc-sprite').first()).toBeVisible()
})

test('оболочка кэшируется вместе с бандлами', async ({ page }) => {
  await page.goto('./')
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 })
    .toBe(true)

  const shell = await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith('recipebook-shell-'))
    if (!key) return []
    return (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)
  })

  // Имена бандлов содержат хеш, поэтому проверяем по расширению:
  // без них офлайн открывал бы пустую страницу.
  expect(shell.some((path) => path.endsWith('.js'))).toBe(true)
  expect(shell.some((path) => path.endsWith('.css'))).toBe(true)
  expect(shell.some((path) => path.endsWith('index.html'))).toBe(true)
})
