/**
 * Converts the output of legacy/DumpTrades.java into the checked-in 1.21.11
 * snapshot. Minecraft redirects stdout through Log4j, therefore the extractor
 * deliberately searches for the marker instead of expecting a clean JSON file.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Source, Stack } from '../src/lib/schema.ts'
import { PROFESSIONS, VILLAGER_VARIANTS, type TradePool, type VillagerCatalog, type VillagerProfile } from './build-trades.ts'

type Offer = Source & { kind: 'trade' }
type RawStack = { id: string; count?: number }
type RawListing = Record<string, any> & { kind: string }

const input = process.argv[2]
const output = process.argv[3] ?? resolve('tools/curated/trades-1.21.11.json')
if (!input) throw new Error('usage: tsx tools/extract-legacy-trades.ts <dump.log> [snapshot.json]')

const marker = 'RECIPEBOOK_TRADES='
const log = readFileSync(input, 'utf8')
const start = log.indexOf(marker)
if (start < 0) throw new Error(`marker ${marker} not found in ${input}`)
const raw = JSON.parse(log.slice(start + marker.length).split(/\r?\n/, 1)[0]!) as {
  professions: Record<string, Record<string, RawListing[]>>
  wandering: { picks: number; offers: RawListing[] }[]
}

const stack = (value: string | RawStack, count?: number): Stack => {
  if (typeof value === 'string') return { id: value, ...(count !== undefined && count !== 1 ? { count } : {}) }
  return { id: value.id, ...(value.count !== undefined && value.count !== 1 ? { count: value.count } : {}) }
}

function common(raw: RawListing, profession: string, level: number, pool: string, poolSize: number, poolPicks: number) {
  return {
    kind: 'trade' as const,
    profession,
    level,
    pool,
    poolSize,
    poolPicks,
    ...(raw.maxUses ? { maxUses: raw.maxUses } : {}),
    ...(raw.villagerXp ?? raw.xp ? { xp: raw.villagerXp ?? raw.xp } : {}),
    ...(raw.priceMultiplier !== undefined ? { reputationDiscount: raw.priceMultiplier } : {}),
  }
}

function listing(raw: RawListing, profession: string, level: number, pool: string, poolSize: number, poolPicks: number, variants: string[] = []): Offer[] {
  const base = common(raw, profession, level, pool, poolSize, poolPicks)
  const withVariants = variants.length ? { merchantVariants: variants } : {}
  switch (raw.kind) {
    case 'EmeraldForItems':
      return [{ ...base, cost: [stack(raw.itemStack)], result: stack('emerald', raw.emeraldAmount), ...withVariants }]
    case 'ItemsForEmeralds':
      return [{ ...base, cost: [stack('emerald', raw.emeraldCost)], result: stack(raw.itemStack), ...withVariants }]
    case 'ItemsAndEmeraldsToItems':
      return [{ ...base, cost: [stack(raw.fromItem), stack('emerald', raw.emeraldCost)], result: stack(raw.toItem), ...withVariants }]
    case 'EnchantedItemForEmeralds':
      return [{ ...base, cost: [stack('emerald', raw.baseEmeraldCost)], result: stack(raw.itemStack), modifiers: ['enchant_with_levels'], dynamicCost: true, ...withVariants }]
    case 'EnchantBookForEmeralds':
      return [{ ...base, cost: [stack('emerald', 0), stack('book')], result: stack('enchanted_book'), maxUses: 12, modifiers: ['enchant_randomly'], dynamicCost: true, ...withVariants }]
    case 'DyedArmorForEmeralds':
      return [{ ...base, cost: [stack('emerald', raw.value)], result: stack(raw.item), modifiers: ['set_random_dyes'], ...withVariants }]
    case 'SuspiciousStewForEmerald':
      return [{ ...base, cost: [stack('emerald')], result: stack('suspicious_stew'), maxUses: 12, modifiers: ['set_stew_effect'], ...withVariants }]
    case 'TippedArrowForItemsAndEmeralds':
      return [{ ...base, cost: [stack(raw.fromItem, raw.fromCount), stack('emerald', raw.emeraldCost)], result: stack(raw.toItem, raw.toCount), modifiers: ['set_potion'], ...withVariants }]
    case 'TreasureMapForEmeralds':
      return [{ ...base, cost: [stack('emerald', raw.emeraldCost), stack('compass')], result: stack('filled_map'), modifiers: ['exploration_map', raw.displayName].filter(Boolean), ...withVariants }]
    case 'EmeraldsForVillagerTypeItem': {
      const grouped = new Map<string, string[]>()
      for (const [variant, item] of Object.entries(raw.trades as Record<string, string>)) {
        const key = String(item)
        grouped.set(key, [...(grouped.get(key) ?? []), variant])
      }
      return [...grouped].map(([item, merchantVariants]) => ({ ...base, cost: [stack(item, raw.cost)], result: stack('emerald'), merchantVariants }))
    }
    case 'TypeSpecificTrade':
      return Object.entries(raw.trades as Record<string, RawListing>).flatMap(([variant, nested]) =>
        listing(nested, profession, level, pool, poolSize, poolPicks, [variant]))
    case 'FailureItemListing':
      return []
    default:
      throw new Error(`unsupported legacy listing ${raw.kind}`)
  }
}

function makePool(id: string, profession: string, level: number, picks: number, raws: RawListing[]): TradePool {
  const offers = raws.flatMap((entry) => listing(entry, profession, level, id, raws.length, picks))
  return { id, ...(level ? { level } : {}), picks, offers }
}

const profiles: VillagerProfile[] = []
for (const profession of Object.keys(raw.professions).sort()) {
  const names = PROFESSIONS[profession]
  if (!names) throw new Error(`unknown legacy profession ${profession}`)
  const pools = Object.entries(raw.professions[profession]!)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([level, offers]) => makePool(`${profession}/level_${level}`, profession, Number(level), 2, offers))
  profiles.push({ id: profession, names: { ru: names.ru, en: names.en }, workstation: names.workstation, variants: VILLAGER_VARIANTS, pools })
}

const wanderingNames = PROFESSIONS.wandering_trader!
profiles.push({
  id: 'wandering_trader',
  names: { ru: wanderingNames.ru, en: wanderingNames.en },
  variants: [],
  pools: raw.wandering.map((entry, index) => makePool(`wandering_trader/${['buying', 'uncommon', 'common'][index] ?? `pool_${index + 1}`}`, 'wandering_trader', 0, entry.picks, entry.offers)),
})
for (const id of ['unemployed', 'nitwit']) {
  const names = PROFESSIONS[id]!
  profiles.push({ id, names: { ru: names.ru, en: names.en }, variants: VILLAGER_VARIANTS, pools: [] })
}

const catalog: VillagerCatalog = { version: '1.21.11', profiles }
writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`)
const offerCount = profiles.flatMap((profile) => profile.pools).reduce((sum, pool) => sum + pool.offers.length, 0)
console.log(`legacy trades: ${profiles.length} profiles, ${offerCount} expanded offers -> ${output}`)
