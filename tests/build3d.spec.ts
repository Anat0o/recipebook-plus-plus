/**
 * Трёхмерные схемы построек.
 *
 * Холст легко «работает» на бумаге и при этом остаётся пустым: матрицы,
 * отсечение граней и порядок умножения ломаются молча, без единой ошибки в
 * консоли. Поэтому здесь сравниваются настоящие пиксели.
 */
import { expect, test, type Locator } from '@playwright/test'

/** Снимок холста: по нему видно, изменилась ли картинка на самом деле. */
async function frame(canvas: Locator): Promise<Buffer> {
  return canvas.screenshot()
}

/** Доля непрозрачных пикселей: пустой холст выдаёт себя нулём. */
async function drawnPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement
    const copy = document.createElement('canvas')
    copy.width = source.width
    copy.height = source.height
    const context = copy.getContext('2d')!
    context.drawImage(source, 0, 0)
    const { data } = context.getImageData(0, 0, copy.width, copy.height)
    let drawn = 0
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 8) drawn += 1
    return drawn / (copy.width * copy.height)
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()
  await page.locator('.build3d').first().scrollIntoViewIfNeeded()
})

test('постройка действительно рисуется, а не остаётся пустым холстом', async ({ page }) => {
  const canvas = page.locator('.build3d__canvas').first()
  await expect(canvas).toBeVisible()

  // Ждём первого кадра и требуем заметной заливки: пустой холст даст ноль.
  await expect.poll(() => drawnPixels(canvas), { timeout: 20000 }).toBeGreaterThan(0.02)
})

test('переключение шага меняет картинку', async ({ page }) => {
  const canvas = page.locator('.build3d__canvas').first()
  await expect.poll(() => drawnPixels(canvas), { timeout: 20000 }).toBeGreaterThan(0.02)

  const finished = await frame(canvas)
  await page.locator('.build3d__step').first().click()
  await page.waitForTimeout(400)
  const firstStep = await frame(canvas)

  expect(firstStep.equals(finished)).toBe(false)
  // На первом шаге блоков меньше, чем на готовой постройке.
  expect(await drawnPixels(canvas)).toBeGreaterThan(0)
})

test('перетаскивание вращает модель', async ({ page }) => {
  const canvas = page.locator('.build3d__canvas').first()
  await expect.poll(() => drawnPixels(canvas), { timeout: 20000 }).toBeGreaterThan(0.02)

  const before = await frame(canvas)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  expect((await frame(canvas)).equals(before)).toBe(false)
})

test('под холстом перечислены блоки шага', async ({ page }) => {
  const legend = page.locator('.build3d__legend').first()
  await expect(legend).toContainText('Сахарный тростник')

  // Холст для скринридера пуст, поэтому у него должна быть подпись.
  await expect(page.locator('.build3d__canvas').first()).toHaveAttribute('aria-label', /Разрез|Шаг|Готово/)
})

test('постройка Визера открывается в 3D с карточки черепа', async ({ page }) => {
  await page.goto('./26.2/item/wither_skeleton_skull')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Использование' }).click()
  await expect(dialog).toContainText('Призыв Визера')

  const canvas = dialog.locator('.build3d__canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  await expect.poll(() => drawnPixels(canvas), { timeout: 20000 }).toBeGreaterThan(0.02)
})

test('при «Уменьшении движения» модель остаётся на месте', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()

  const canvas = page.locator('.build3d__canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  // Модель — это содержание гайда, а не украшение: гасить её нельзя.
  await expect.poll(() => drawnPixels(canvas), { timeout: 20000 }).toBeGreaterThan(0.02)

  // А переходы между шагами при этом мгновенные.
  const longest = await page.evaluate(() =>
    Math.max(
      0,
      ...[...document.querySelectorAll('.build3d__step')].map((element) => {
        const value = getComputedStyle(element).transitionDuration
        return value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
      }),
    ),
  )
  expect(longest).toBeLessThanOrEqual(1)
})

test('лента шагов остаётся нажимаемой', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()

  const step = page.locator('.build3d__step').first()
  const box = (await step.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(43.5)
})

test('анимацию можно запускать, ускорять, сбрасывать и смотреть в разрезе', async ({ page }) => {
  const controls = page.locator('.build3d__animation').first()
  await expect(controls).toBeVisible()
  await controls.getByRole('button', { name: '2×' }).click()
  await controls.getByRole('button', { name: 'Разрез' }).click()
  await expect(controls.getByRole('button', { name: 'Разрез' })).toHaveClass(/is-active/)

  await controls.getByRole('button', { name: 'Пуск' }).click()
  await expect.poll(async () => (await controls.locator('.build3d__state').textContent()) ?? '').toMatch(/такт [1-9]/)
  await controls.getByRole('button', { name: 'Пауза' }).click()
  await controls.getByRole('button', { name: 'Сброс' }).click()
  await expect(controls.locator('.build3d__state')).toContainText('такт 0; пауза')
})

test('при уменьшении движения остаётся ручное покадровое управление', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()

  const controls = page.locator('.build3d__animation').first()
  await expect(controls.getByRole('button', { name: 'Пуск' })).toBeDisabled()
  await controls.getByRole('button', { name: 'Кадр' }).click()
  await expect(controls.locator('.build3d__state')).toContainText('такт 1')
})
