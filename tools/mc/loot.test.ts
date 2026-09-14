/**
 * Проверка вероятностной математики по значениям, известным из игры и вики.
 * Тесты идут по настоящим таблицам версии, а не по выдуманным фикстурам.
 */
import { describe, expect, it } from 'vitest'
import { TagIndex } from './tags.ts'
import { evaluateTable, type LootDeps } from './loot.ts'
import { LootRepository, context } from './loot-repo.ts'
import { sourceDir } from '../fetch-mcmeta.ts'
import { DEFAULT_VERSION } from '../config.ts'

const DATA_ROOT = `${sourceDir(DEFAULT_VERSION, 'data-json')}/data/minecraft`
const repo = new LootRepository(DATA_ROOT)
const itemTags = new TagIndex(DATA_ROOT, 'item')

function deps(): LootDeps {
  return { table: (id) => repo.get(id), itemTags, unknown: new Set() }
}

function drops(table: string, ctx: Parameters<typeof context>[0]) {
  return evaluateTable(repo.get(table), context(ctx), deps())
}

describe('череп визер-скелета', () => {
  it('выпадает с шансом 2,5 % без Добычи', () => {
    const skull = drops('entities/wither_skeleton', {}).get('minecraft:wither_skeleton_skull')
    expect(skull?.chance).toBeCloseTo(0.025, 6)
  })

  it('с Добычей III шанс растёт до 5,5 %', () => {
    const skull = drops('entities/wither_skeleton', { looting: 3 }).get('minecraft:wither_skeleton_skull')
    expect(skull?.chance).toBeCloseTo(0.055, 6)
  })

  it('не выпадает, если моба убил не игрок', () => {
    const skull = drops('entities/wither_skeleton', { killedByPlayer: false }).get('minecraft:wither_skeleton_skull')
    expect(skull?.chance ?? 0).toBe(0)
  })

  it('помечен условием «убит игроком»', () => {
    const skull = drops('entities/wither_skeleton', {}).get('minecraft:wither_skeleton_skull')
    expect([...(skull?.conditions ?? [])]).toContain('killed_by_player')
  })

  it('уголь падает в среднем 1/3 штуки — равномерно от −1 до 1', () => {
    const coal = drops('entities/wither_skeleton', {}).get('minecraft:coal')
    expect(coal?.expected).toBeCloseTo(1 / 3, 6)
    expect(coal?.chance).toBeCloseTo(1 / 3, 6)
  })
})

describe('удача на рудах', () => {
  it('алмазная руда без Удачи даёт ровно один алмаз', () => {
    const diamond = drops('blocks/diamond_ore', {}).get('minecraft:diamond')
    expect(diamond?.expected).toBeCloseTo(1, 6)
    expect(diamond?.chance).toBeCloseTo(1, 6)
  })

  it('Удача III даёт в среднем 2,2 алмаза', () => {
    const diamond = drops('blocks/diamond_ore', { fortune: 3 }).get('minecraft:diamond')
    expect(diamond?.expected).toBeCloseTo(2.2, 6)
  })

  it('шёлковое касание возвращает саму руду, а не алмаз', () => {
    const silk = drops('blocks/diamond_ore', { silkTouch: true })
    expect(silk.get('minecraft:diamond_ore')?.chance).toBeCloseTo(1, 6)
    expect(silk.get('minecraft:diamond')?.chance ?? 0).toBe(0)
  })
})

describe('целостность разбора', () => {
  it('во всех таблицах версии не встречается неизвестных условий и функций', () => {
    const d = deps()
    for (const { json } of repo.list()) evaluateTable(json, context({}), d)
    expect([...d.unknown]).toEqual([])
  })
})
