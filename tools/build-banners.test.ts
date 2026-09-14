/**
 * Проверки данных ткацкого станка.
 *
 * Главное здесь — связь узора с предметом-образцом: имена расходятся
 * (field_masoned_banner_pattern даёт узор bricks), поэтому угадывание по имени
 * молча дало бы неверный ответ. Тест ловит именно этот случай.
 */
import { describe, expect, it } from 'vitest'
import { buildBanners } from './build-banners.ts'
import { buildItems } from './build-items.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DEFAULT_VERSION, LOCALES } from './config.ts'
import { COLOR_ORDER } from './curated/banner-colors.ts'
import { MAX_LAYERS } from './curated/banners.ts'

const DATA_ROOT = `${sourceDir(DEFAULT_VERSION, 'data-json')}/data/minecraft`
const OUT_DIR = 'public/data/' + DEFAULT_VERSION

const knownItems = new Set(buildItems(DEFAULT_VERSION).items.map((item) => item.id))
const { data, problems } = await buildBanners(DEFAULT_VERSION, DATA_ROOT, knownItems, OUT_DIR)

describe('узоры баннеров', () => {
  it('собираются все узоры версии', () => {
    expect(data.patterns.length).toBe(43)
  })

  it('образец нужен ровно десяти узорам, остальным хватает красителя', () => {
    const withItem = data.patterns.filter((pattern) => pattern.patternItem)
    expect(withItem.length).toBe(10)
    expect(data.patterns.length - withItem.length).toBe(33) // 32 узора + сама основа
  })

  it('образец связан с узором по тегу, а не по имени', () => {
    const bricks = data.patterns.find((pattern) => pattern.id === 'bricks')
    const curly = data.patterns.find((pattern) => pattern.id === 'curly_border')
    expect(bricks?.patternItem).toBe('field_masoned_banner_pattern')
    expect(curly?.patternItem).toBe('bordure_indented_banner_pattern')
  })

  it('каждый образец существует в реестре предметов', () => {
    for (const pattern of data.patterns) {
      if (pattern.patternItem) expect(knownItems.has(pattern.patternItem)).toBe(true)
    }
  })

  it('у каждого узора есть официальное название для всех 16 цветов на обоих языках', () => {
    const languages = Object.values(LOCALES)
    for (const pattern of data.patterns) {
      for (const color of COLOR_ORDER) {
        for (const language of languages) {
          expect(pattern.names[color]?.[language], `${pattern.id}/${color}/${language}`).toBeTruthy()
        }
      }
    }
  })

  it('сборка проходит без замечаний', () => {
    expect(problems).toEqual([])
  })
})

describe('готовые дизайны', () => {
  it('не содержит удалённый триколор', () => {
    expect(data.designs).toHaveLength(19)
    expect(data.designs.some((design) => design.id === 'stripes' || design.ru === 'Триколор')).toBe(false)
  })

  it('ссылаются только на существующие узоры', () => {
    const available = new Set(data.patterns.map((pattern) => pattern.id))
    for (const design of data.designs) {
      for (const layer of design.layers) {
        expect(available.has(layer.pattern), `${design.id} → ${layer.pattern}`).toBe(true)
      }
    }
  })

  it('используют только цвета красителей игры', () => {
    for (const design of data.designs) {
      expect(data.colors[design.base], design.id).toBeTruthy()
      for (const layer of design.layers) {
        expect(data.colors[layer.color], `${design.id} → ${layer.color}`).toBeTruthy()
      }
    }
  })

  it('укладываются в предел слоёв баннера', () => {
    for (const design of data.designs) {
      // Основа тоже слой, поэтому вместе с ней слоёв не больше шести.
      expect(design.layers.length + 1, design.id).toBeLessThanOrEqual(MAX_LAYERS)
    }
  })

  it('имеют уникальные идентификаторы и названия на обоих языках', () => {
    const ids = data.designs.map((design) => design.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const design of data.designs) {
      expect(design.ru.length, design.id).toBeGreaterThan(0)
      expect(design.en.length, design.id).toBeGreaterThan(0)
    }
  })
})
