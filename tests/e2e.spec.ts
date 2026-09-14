/**
 * Сквозные проверки: сайт должен отвечать на два вопроса из постановки задачи —
 * как добыть череп визер-скелета и откуда берутся музыкальные пластинки.
 */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Ошибки в консоли роняют тест — молча битый экран не пройдёт.
  expect(errors).toEqual([])
})

async function openItem(page: import('@playwright/test').Page, query: string): Promise<void> {
  await page.getByRole('searchbox').fill(query)
  await page.locator('.item-row').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('череп визер-скелета: 2,5 % и рост до 5,5 % при Добыче III', async ({ page }) => {
  await openItem(page, 'wither_skeleton_skull')

  // Череп есть и как блок (100 %), поэтому ищем именно раздел «С существ».
  const mobDrop = page.locator('.section', { hasText: 'С существ' }).locator('.recipe--loot').first()
  await expect(mobDrop).toContainText('2.5 %')
  await expect(mobDrop).toContainText('убит игроком')

  await page.getByRole('slider').first().fill('3')
  await expect(mobDrop).toContainText('5.5 %')
})

test('череп: без убийства игроком шанс обнуляется', async ({ page }) => {
  await openItem(page, 'wither_skeleton_skull')
  const mobDrop = page.locator('.section', { hasText: 'С существ' }).locator('.recipe--loot').first()
  await page.getByRole('switch').click()
  await expect(mobDrop).toContainText('0 %')
})

test('пластинка: и дроп с крипера, и сундуки структур', async ({ page }) => {
  await openItem(page, 'music_disc_cat')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Крипер')
  await expect(dialog).toContainText('Сундуки и структуры')
})

test('алмаз: крафт из блока и добыча из руды', async ({ page }) => {
  await openItem(page, 'diamond')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Верстак')
  await expect(dialog).toContainText('Из блоков')
})

test('переход по ингредиенту открывает его карточку', async ({ page }) => {
  await openItem(page, 'diamond_block')
  await page.getByRole('dialog').locator('.mc-slot--link').first().click()
  await expect(page.getByRole('dialog')).toContainText('diamond')
})

test('глубокая ссылка на предмет открывает карточку сразу', async ({ page }) => {
  await page.goto('./26.2/item/wither_skeleton_skull')
  await expect(page.getByRole('dialog')).toContainText('Череп визер-скелета')
})

test('переключение версии меняет данные и адрес', async ({ page }) => {
  await page.getByRole('button', { name: 'Настройки' }).click()
  await page.getByRole('button', { name: '1.21.11' }).click()
  await expect(page).toHaveURL(/1\.21\.11$/)
  // В 1.21.x сделки жителей зашиты в код игры — раздел должен честно об этом сказать.
  await expect(page.locator('.notice')).toContainText('зашиты в код игры')
})

test('особые рецепты видны на странице результата', async ({ page }) => {
  await page.goto('./26.2/item/firework_rocket')
  await expect(page.getByRole('dialog')).toContainText('Ракета')
})

test('варочная стойка: дерево зелий с официальными названиями', async ({ page }) => {
  await page.goto('./26.2/station/brewing_stand')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Мутное зелье')
  await expect(dialog).toContainText('Зелье стремительности')
  // Механика брожения зашита в код игры — интерфейс обязан сказать об этом прямо.
  await expect(dialog).toContainText('не описанных данными игры')
})

test('стол зачарований: список из данных версии', async ({ page }) => {
  await page.goto('./26.2/station/enchanting_table')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Удача III')
  await expect(dialog).toContainText('Несовместимо с')
})

test('станции открываются прямо из каталога', async ({ page }) => {
  await page.locator('.item-grid--stations').getByRole('button', { name: 'Варочная стойка' }).click()
  await expect(page).toHaveURL(/station\/brewing_stand$/)
})

test('ткацкий станок: галерея баннеров и последовательность слоёв', async ({ page }) => {
  await page.goto('./26.2/station/loom')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Готовые баннеры')
  await expect(dialog).toContainText('Крипер')

  await dialog.getByRole('button', { name: /Крипер/ }).click()
  await expect(dialog).toContainText('Последовательность')
  // Первый шаг — сам баннер-основа, второй — нанесение узора красителем.
  await expect(dialog.locator('.recipe--loom')).toHaveCount(2)
})

test('ткацкий станок: узору с образцом показан нужный предмет', async ({ page }) => {
  await page.goto('./26.2/station/loom')
  const dialog = page.getByRole('dialog')
  const row = dialog.locator('.pattern-row', { hasText: 'bricks' }).first()
  await row.locator('.pattern-row__item').click()
  // Именно field_masoned_banner_pattern, хотя узор называется bricks.
  await expect(page).toHaveURL(/field_masoned_banner_pattern$/)
})

test('кузнечный стол показывает полные комплекты и варианты выбранной отделки', async ({ page }) => {
  await page.goto('./26.2/station/smithing_table')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Готовые комплекты с отделкой')
  await expect(dialog.locator('.armor-gallery:not(.armor-gallery--variants) .armor-card')).toHaveCount(18)
  await expect(dialog.getByRole('radio', { checked: true })).toContainText('Золотая')

  await dialog.locator('.armor-gallery .armor-card').first().click()
  await expect(dialog).toContainText('Тот же узор и материал')
  await expect(dialog.locator('.armor-gallery--variants .armor-card')).toHaveCount(7)
  await expect(dialog.locator('.armor-gallery--variants')).toContainText('Незеритовый нагрудник')

  await dialog.getByRole('radio', { name: /Редстоуновая/ }).click()
  await expect(dialog.getByRole('radio', { name: /Редстоуновая/ })).toHaveAttribute('aria-checked', 'true')
})

test('повторный тап активной вкладки возвращает её корневой экран', async ({ page }) => {
  await openItem(page, 'diamond')
  await page.getByRole('button', { name: 'Каталог', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible()

  await page.getByRole('button', { name: 'Жители', exact: true }).click()
  await page.getByRole('button', { name: /Библиотекарь/ }).click()
  await expect(page.getByRole('heading', { name: 'Рабочий блок' })).toBeVisible()
  await page.getByRole('button', { name: 'Жители', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Жители' })).toBeVisible()
  await expect(page.locator('.villager-card')).toHaveCount(16)
})

test('свайп от левого края работает как «назад» на телефоне', async ({ page }) => {
  const swipeBack = async (): Promise<void> => page.evaluate(() => {
    dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: 6, clientY: 360,
    }))
    dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: 126, clientY: 364,
    }))
  })

  await openItem(page, 'diamond')
  await swipeBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()
  await expect(page.getByRole('heading', { name: 'Ферма тростника' })).toBeVisible()
  await swipeBack()
  await expect(page.getByRole('heading', { name: 'Автофермы' })).toBeVisible()
})

test('шанс с Добычей III виден сразу, без слайдера', async ({ page }) => {
  await page.goto('./26.2/item/wither_skeleton_skull')
  const mobDrop = page.locator('.section', { hasText: 'С существ' }).locator('.recipe--loot').first()
  await expect(mobDrop).toContainText('2.5 %')
  await expect(mobDrop).toContainText('С Добычей III')
  await expect(mobDrop).toContainText('5.5 %')
})

test('ткацкий станок открывается из каталога', async ({ page }) => {
  await page.locator('.item-grid--stations').getByRole('button', { name: 'Ткацкий станок' }).click()
  await expect(page).toHaveURL(/station\/loom$/)
})

test('поиск живёт в каталоге, отдельной вкладки нет', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Поиск', exact: true })).toHaveCount(0)

  const search = page.getByRole('searchbox')
  await expect(search).toBeVisible()
  await search.fill('алмаз')
  await expect(page.locator('.item-row__name').first()).toContainText(/Алмаз/)
})

test('«ломается в себя» скрыто, а условная добыча остаётся', async ({ page }) => {
  await page.goto('./26.2/item/dirt')
  const dialog = page.getByRole('dialog')
  // Земля выпадает из тропинки, дёрна и мицелия — эти карточки нужны,
  // а бесполезной «земля → земля» быть не должно.
  await expect(dialog).toContainText('Тропинка')
  await expect(dialog.locator('.recipe--loot .recipe__origin-name', { hasText: /^Земля$/ })).toHaveCount(0)

  await page.goto('./26.2/item/stone')
  await expect(page.getByRole('dialog')).toContainText('шёлк')
})

test('блок, у которого нет других способов, из каталога не пропал', async ({ page }) => {
  await page.goto('./26.2/item/end_stone')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Эндерняк')
  // Единственный способ — разрушение блока, и он показан.
  await expect(dialog.locator('.recipe--loot')).not.toHaveCount(0)
})

test('предметы из команд скрыты, а переключатель их возвращает', async ({ page }) => {
  const search = page.getByRole('searchbox')
  await search.fill('Барьер')
  await expect(page.locator('.item-row')).toHaveCount(0)

  await page.getByRole('button', { name: 'Настройки', exact: true }).click()
  await page.getByRole('switch', { name: /Предметы только из команд/ }).click()

  await page.getByRole('button', { name: 'Каталог', exact: true }).click()
  await page.getByRole('searchbox').fill('Барьер')
  await expect(page.locator('.item-row__name').first()).toContainText('Барьер')
})

test('череп визер-скелета показывает постройку Визера', async ({ page }) => {
  await page.goto('./26.2/item/wither_skeleton_skull')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Использование' }).click()
  await expect(dialog).toContainText('Призыв Визера')
  await expect(dialog.locator('.build3d')).not.toHaveCount(0)
})

test('тыква и блок железа ведут к големам', async ({ page }) => {
  await page.goto('./26.2/item/carved_pumpkin')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Использование' }).click()
  await expect(dialog).toContainText('Железный голем')
  await expect(dialog).toContainText('Медный голем')
})

test('гайд фермы открывается и переключает слои схемы', async ({ page }) => {
  await page.getByRole('button', { name: 'Автофермы', exact: true }).click()
  await page.getByRole('button', { name: /Ферма тростника/ }).click()

  await expect(page.getByRole('heading', { name: 'Ферма тростника' })).toBeVisible()
  await expect(page.getByText('Java')).toBeVisible()

  // Шагов сборки четыре и ещё вкладка готового результата.
  const steps = page.locator('.build3d__step')
  await expect(steps).toHaveCount(5)
  await steps.first().click()
  await expect(steps.first()).toHaveAttribute('aria-selected', 'true')
})

test('раздел редстоуна открывает механику со схемами', async ({ page }) => {
  await page.getByRole('button', { name: 'Редстоун', exact: true }).click()
  await page.getByRole('button', { name: /Логические вентили/ }).click()
  // У вентилей четыре схемы: НЕ, ИЛИ, И и исключающее ИЛИ.
  await expect(page.locator('.build3d')).toHaveCount(4)
})

test('вкладка жителей показывает все роли и ищет по рабочему блоку', async ({ page }) => {
  await page.getByRole('button', { name: 'Жители', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Жители' })).toBeVisible()
  await expect(page.locator('.villager-card')).toHaveCount(16)

  await page.getByPlaceholder('Профессия, блок или предмет').fill('Компостница')
  await expect(page.locator('.villager-card')).toHaveCount(1)
  await expect(page.locator('.villager-card')).toContainText('Фермер')
})

test('карточка жителя показывает облики, уровни и открывает предмет сделки', async ({ page }) => {
  await page.getByRole('button', { name: 'Жители', exact: true }).click()
  await page.getByRole('button', { name: /Библиотекарь/ }).click()

  await expect(page.getByRole('heading', { name: 'Рабочий блок' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Облики' })).toBeVisible()
  await expect(page.locator('.villager-variants span')).toHaveCount(7)
  await expect(page.getByRole('heading', { name: /Новичок · уровень 1/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Мастер · уровень 5/ })).toBeVisible()

  await page.locator('.villager-trade .mc-slot--link').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('сайт объявляет себя приложением', async ({ page }) => {
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  // Без apple-touch-icon iOS ставит на экран «Домой» скриншот страницы.
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)

  const manifest = await page.request.get(manifestHref!)
  expect(manifest.ok()).toBe(true)
  const parsed = await manifest.json()
  expect(parsed.display).toBe('standalone')
  expect(parsed.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true)
})
