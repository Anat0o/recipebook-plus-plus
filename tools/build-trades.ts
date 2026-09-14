/** Полный справочник торговли из реальных trade_set и вложенных тегов. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { Source, Stack } from '../src/lib/schema.ts'

export const VILLAGER_VARIANTS = ['plains', 'desert', 'savanna', 'taiga', 'snow', 'swamp', 'jungle']

export const PROFESSIONS: Record<string, { ru: string; en: string; workstation?: string }> = {
  armorer: { ru: 'Бронник', en: 'Armorer', workstation: 'blast_furnace' },
  butcher: { ru: 'Мясник', en: 'Butcher', workstation: 'smoker' },
  cartographer: { ru: 'Картограф', en: 'Cartographer', workstation: 'cartography_table' },
  cleric: { ru: 'Священник', en: 'Cleric', workstation: 'brewing_stand' },
  farmer: { ru: 'Фермер', en: 'Farmer', workstation: 'composter' },
  fisherman: { ru: 'Рыбак', en: 'Fisherman', workstation: 'barrel' },
  fletcher: { ru: 'Лучник', en: 'Fletcher', workstation: 'fletching_table' },
  leatherworker: { ru: 'Кожевник', en: 'Leatherworker', workstation: 'cauldron' },
  librarian: { ru: 'Библиотекарь', en: 'Librarian', workstation: 'lectern' },
  mason: { ru: 'Каменщик', en: 'Mason', workstation: 'stonecutter' },
  shepherd: { ru: 'Пастух', en: 'Shepherd', workstation: 'loom' },
  toolsmith: { ru: 'Инструментальщик', en: 'Toolsmith', workstation: 'smithing_table' },
  weaponsmith: { ru: 'Оружейник', en: 'Weaponsmith', workstation: 'grindstone' },
  wandering_trader: { ru: 'Странствующий торговец', en: 'Wandering Trader' },
  unemployed: { ru: 'Безработный', en: 'Unemployed' },
  nitwit: { ru: 'Дурачок', en: 'Nitwit' },
}

export interface TradePool {
  id: string
  level?: number
  picks: number
  offers: (Source & { kind: 'trade' })[]
}

export interface VillagerProfile {
  id: string
  names: Record<string, string>
  workstation?: string
  variants: string[]
  pools: TradePool[]
}

export interface VillagerCatalog {
  version: string
  profiles: VillagerProfile[]
}

export interface TradeBuildResult {
  sources: Source[]
  professions: number
  catalog: VillagerCatalog
}

const short = (id: string): string => id.replace(/^minecraft:/, '')

export function buildTrades(dataRoot: string, version = '26.2'): TradeBuildResult {
  const setRoot = join(dataRoot, 'trade_set')
  if (!existsSync(setRoot)) return buildLegacyTrades(version)

  const tradeRoot = join(dataRoot, 'villager_trade')
  const tagRoot = join(dataRoot, 'tags', 'villager_trade')
  const resolveTag = (tag: string, seen = new Set<string>()): string[] => {
    const id = short(tag.replace(/^#/, ''))
    if (seen.has(id)) throw new Error(`циклический тег торговли: ${id}`)
    const file = join(tagRoot, `${id}.json`)
    if (!existsSync(file)) throw new Error(`не найден тег торговли: ${id}`)
    const values = JSON.parse(readFileSync(file, 'utf8')).values ?? []
    const nextSeen = new Set(seen).add(id)
    return values.flatMap((entry: string | { id: string; required?: boolean }) => {
      const value = typeof entry === 'string' ? entry : entry.id
      return value.startsWith('#') ? resolveTag(value, nextSeen) : [short(value)]
    })
  }

  const profileIds = readdirSync(setRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && PROFESSIONS[entry.name])
    .map((entry) => entry.name)
    .sort()
  const profiles: VillagerProfile[] = []
  const sources: Source[] = []

  for (const profession of profileIds) {
    const pools: TradePool[] = []
    const dir = join(setRoot, profession)
    for (const fileName of readdirSync(dir).filter((file) => file.endsWith('.json')).sort()) {
      const set = JSON.parse(readFileSync(join(dir, fileName), 'utf8'))
      const ids = typeof set.trades === 'string' && set.trades.startsWith('#')
        ? resolveTag(set.trades)
        : [short(set.trades)]
      const levelMatch = /^level_(\d+)\.json$/.exec(fileName)
      const level = levelMatch ? Number(levelMatch[1]) : 1
      const pool = `${profession}/${basename(fileName, '.json')}`
      const picks = Math.round(set.amount ?? 1)
      const offers = ids.map((id) => {
        const file = join(tradeRoot, `${id}.json`)
        if (!existsSync(file)) throw new Error(`не найдена сделка ${id} из ${pool}`)
        return parseTrade(JSON.parse(readFileSync(file, 'utf8')), profession, level, pool, ids.length, picks)
      })
      pools.push({ id: pool, ...(levelMatch ? { level } : {}), picks, offers })
      sources.push(...offers)
    }
    const names = PROFESSIONS[profession]!
    profiles.push({
      id: profession,
      names: { ru: names.ru, en: names.en },
      ...(names.workstation ? { workstation: names.workstation } : {}),
      variants: profession === 'wandering_trader' ? [] : VILLAGER_VARIANTS,
      pools,
    })
  }

  for (const id of ['unemployed', 'nitwit']) {
    const names = PROFESSIONS[id]!
    profiles.push({ id, names: { ru: names.ru, en: names.en }, variants: VILLAGER_VARIANTS, pools: [] })
  }
  return { sources, professions: 13, catalog: { version, profiles } }
}

function parseTrade(trade: any, profession: string, level: number, pool: string, poolSize: number, poolPicks: number): Source & { kind: 'trade' } {
  const stack = (value: any): Stack => ({
    id: short(value.id),
    ...(value.count !== undefined && value.count !== 1 ? { count: Math.round(value.count) } : {}),
  })
  const cost = [trade.wants, trade.additional_wants].filter(Boolean).map(stack)
  if (!trade.gives?.id || cost.length === 0) throw new Error(`неполная сделка в ${pool}`)
  const variantRule = trade.merchant_predicate?.predicate?.['minecraft:predicates']?.['minecraft:villager/variant']
  const variants: string[] = (Array.isArray(variantRule) ? variantRule : variantRule ? [variantRule] : []).map(short)
  const modifiers: string[] = (trade.given_item_modifiers ?? [])
    .map((modifier: any) => short(modifier.function))
    .filter((value: string, index: number, all: string[]) => all.indexOf(value) === index)
  return {
    kind: 'trade', profession, level, cost, result: stack(trade.gives), pool, poolSize, poolPicks,
    ...(trade.max_uses ? { maxUses: Math.round(trade.max_uses) } : {}),
    ...(trade.xp ? { xp: Math.round(trade.xp) } : {}),
    ...(trade.reputation_discount !== undefined ? { reputationDiscount: trade.reputation_discount } : {}),
    ...(variants.length ? { merchantVariants: variants } : {}),
    ...(modifiers.length ? { modifiers } : {}),
    ...([trade.wants, trade.additional_wants].some((value) => value?.count === 0) ? { dynamicCost: true } : {}),
  }
}

function buildLegacyTrades(version: string): TradeBuildResult {
  const file = new URL('./curated/trades-1.21.11.json', import.meta.url)
  if (!existsSync(file)) throw new Error('нет снимка торговли для 1.21.11')
  const catalog = JSON.parse(readFileSync(file, 'utf8')) as VillagerCatalog
  catalog.version = version
  const sources = catalog.profiles.flatMap((profile) => profile.pools.flatMap((pool) => pool.offers))
  return { sources, professions: 13, catalog }
}
