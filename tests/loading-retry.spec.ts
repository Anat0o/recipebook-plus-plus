import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('ошибка версии не отравляет кэш и повтор загружает данные', async ({ page }) => {
  let failedOnce = false
  await page.route('**/data/26.2/meta.json', async (route) => {
    if (!failedOnce) {
      failedOnce = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  await page.goto('./26.2')
  await expect(page.getByText('Не удалось загрузить данные версии.')).toBeVisible()
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(failedOnce).toBe(true)
})

test('список версий тоже можно загрузить повторно', async ({ page }) => {
  let failedOnce = false
  await page.route('**/data/versions.json', async (route) => {
    if (!failedOnce) {
      failedOnce = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })

  await page.goto('./')
  await expect(page.getByText('Не удалось загрузить данные версии.')).toBeVisible()
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
