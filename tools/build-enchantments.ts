/**
 * Зачарования: с 1.21 они описаны данными, поэтому список, уровни, стоимость
 * на наковальне и взаимоисключения читаются прямо из data/minecraft/enchantment.
 * Механика самого стола (сколько уровней просит слот) в код игры зашита —
 * её здесь нет, и в интерфейсе об этом сказано прямо.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { sourceDir } from './fetch-mcmeta.ts'
import { LOCALES } from './config.ts'
import { TagIndex } from './mc/tags.ts'

export interface EnchantmentEntry {
  id: string
  names: Record<string, string>
  maxLevel: number
  /** Вес в случайном выборе: чем больше, тем чаще выпадает. */
  weight: number
  anvilCost: number
  /** Предметы, к которым применимо. */
  items: string[]
  /** Исходный тег применимости, если он был. */
  itemsTag?: string
  /** Несовместимые зачарования. */
  exclusiveWith: string[]
  /** Порог опыта для первого и последнего уровня. */
  minCost: number[]
  treasureOnly: boolean
}

export function buildEnchantments(version: string, dataRoot: string): EnchantmentEntry[] {
  const dir = join(dataRoot, 'enchantment')
  if (!existsSync(dir)) return []

  const langDir = join(sourceDir(version, 'assets-json'), 'assets', 'minecraft', 'lang')
  const lang: Record<string, Record<string, string>> = {}
  for (const [mcCode, siteCode] of Object.entries(LOCALES)) {
    lang[siteCode] = JSON.parse(readFileSync(join(langDir, `${mcCode}.json`), 'utf8'))
  }

  const itemTags = new TagIndex(dataRoot, 'item')
  const enchantmentTags = new TagIndex(dataRoot, 'enchantment')
  const treasure = new Set(enchantmentTags.resolve('minecraft:treasure').map(strip))

  const entries: EnchantmentEntry[] = []

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const id = file.slice(0, -'.json'.length)
    const json = JSON.parse(readFileSync(join(dir, file), 'utf8'))

    const names: Record<string, string> = {}
    for (const [siteCode, dict] of Object.entries(lang)) {
      const name = dict[`enchantment.minecraft.${id}`]
      if (name) names[siteCode] = name
    }

    const supported: unknown = json.supported_items
    const itemsTag = typeof supported === 'string' && supported.startsWith('#') ? supported.slice(1) : undefined
    const items = itemsTag
      ? itemTags.resolve(itemsTag).map(strip)
      : typeof supported === 'string'
        ? [strip(supported)]
        : Array.isArray(supported)
          ? supported.map((value) => strip(String(value)))
          : []

    const exclusive: unknown = json.exclusive_set
    const exclusiveWith =
      typeof exclusive === 'string' && exclusive.startsWith('#')
        ? enchantmentTags.resolve(exclusive.slice(1)).map(strip).filter((other) => other !== id)
        : typeof exclusive === 'string'
          ? [strip(exclusive)]
          : Array.isArray(exclusive)
            ? exclusive.map((value) => strip(String(value)))
            : []

    const maxLevel = json.max_level ?? 1
    entries.push({
      id,
      names,
      maxLevel,
      weight: json.weight ?? 1,
      anvilCost: json.anvil_cost ?? 1,
      items,
      itemsTag,
      exclusiveWith,
      minCost: [levelCost(json.min_cost, 1), levelCost(json.min_cost, maxLevel)],
      treasureOnly: treasure.has(id),
    })
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

/** min_cost задан как линейная функция уровня. */
function levelCost(value: { base?: number; per_level_above_first?: number } | undefined, level: number): number {
  if (!value) return 0
  return (value.base ?? 0) + (level - 1) * (value.per_level_above_first ?? 0)
}

function strip(id: string): string {
  return id.replace(/^minecraft:/, '')
}
