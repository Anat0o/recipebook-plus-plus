import { describe, expect, it } from 'vitest'
import { buildTrades, PROFESSIONS } from './build-trades.ts'
import { sourceDir } from './fetch-mcmeta.ts'

const versions = ['26.2', '26.1.2', '1.21.11']

describe.each(versions)('villager trades %s', (version) => {
  const catalog = buildTrades(`${sourceDir(version, 'data-json')}/data/minecraft`, version)

  it('contains 13 real professions and no internal smith profession', () => {
    const employed = catalog.catalog.profiles.filter((profile) => profile.workstation)
    expect(employed).toHaveLength(13)
    expect(catalog.catalog.profiles.some((profile) => profile.id === 'smith')).toBe(false)
    for (const profile of employed) expect(profile.workstation).toBe(PROFESSIONS[profile.id]!.workstation)
  })

  it('keeps all pools, conditional variants and dynamic prices', () => {
    const offers = catalog.catalog.profiles.flatMap((profile) => profile.pools.flatMap((pool) => pool.offers))
    expect(offers.length).toBeGreaterThan(300)
    if (version !== '26.1.2') expect(offers.some((offer) => offer.merchantVariants?.length)).toBe(true)
    expect(catalog.catalog.profiles.find((profile) => profile.id === 'farmer')?.variants).toHaveLength(7)
    expect(offers.some((offer) => offer.modifiers?.length)).toBe(true)
    for (const offer of offers.filter((entry) => entry.dynamicCost)) {
      expect(offer.cost.some((cost) => cost.count === 0) || version === '1.21.11').toBe(true)
    }
  })

  it('contains wandering trader pools and non-trading villagers', () => {
    expect(catalog.catalog.profiles.find((profile) => profile.id === 'wandering_trader')?.pools.length).toBeGreaterThan(0)
    expect(catalog.catalog.profiles.find((profile) => profile.id === 'unemployed')?.pools).toEqual([])
    expect(catalog.catalog.profiles.find((profile) => profile.id === 'nitwit')?.pools).toEqual([])
  })
})
