import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildArmorTrims } from './build-armor-trims.ts'
import { buildItems } from './build-items.ts'
import { DEFAULT_VERSION } from './config.ts'
import { sourceDir } from './fetch-mcmeta.ts'

const DATA_ROOT = `${sourceDir(DEFAULT_VERSION, 'data-json')}/data/minecraft`
const OUT_DIR = `public/data/${DEFAULT_VERSION}`
const knownItems = new Set(buildItems(DEFAULT_VERSION).items.map((item) => item.id))
const { data, problems } = await buildArmorTrims(DEFAULT_VERSION, DATA_ROOT, knownItems, OUT_DIR)

describe('готовые комплекты кузнечного стола', () => {
  it('собирает все узоры, материалы и доступные полные комплекты', () => {
    expect(data.patterns).toHaveLength(18)
    expect(data.materials).toHaveLength(11)
    expect(data.armor.map((entry) => entry.id)).toEqual([
      'leather', 'chainmail', 'copper', 'iron', 'gold', 'diamond', 'netherite',
    ])
    expect(Object.keys(data.index)).toHaveLength(18 * 11 * 7)
  })

  it('каждая карточка ссылается на существующие предметы', () => {
    for (const pattern of data.patterns) expect(knownItems.has(pattern.template), pattern.id).toBe(true)
    for (const material of data.materials) expect(knownItems.has(material.item), material.id).toBe(true)
    for (const armor of data.armor) expect(knownItems.has(armor.chestplate), armor.id).toBe(true)
  })

  it('имеет названия на обоих языках и официальный атлас', () => {
    for (const entry of [...data.patterns, ...data.materials, ...data.armor]) {
      expect(entry.names.ru, `${entry.id}/ru`).toBeTruthy()
      expect(entry.names.en, `${entry.id}/en`).toBeTruthy()
    }
    expect(existsSync(`${OUT_DIR}/${data.file}`)).toBe(true)
    expect(problems).toEqual([])
  })
})
