import { describe, expect, it } from 'vitest'
import { BEACON_TIERS, beaconMineralCount, beaconPyramid } from './beacon.ts'

describe('пирамиды маяка', () => {
  it('содержат полные уровни 3×3, 5×5, 7×7 и 9×9', () => {
    expect(BEACON_TIERS.map(beaconMineralCount)).toEqual([9, 34, 83, 164])
    for (const tier of BEACON_TIERS) {
      const placements = beaconPyramid(tier)
      expect(placements.filter((entry) => entry.block === 'iron_block')).toHaveLength(beaconMineralCount(tier))
      expect(placements.filter((entry) => entry.block === 'beacon')).toEqual([
        { x: 0, y: tier, z: 0, block: 'beacon', step: tier + 1 },
      ])
    }
  })

  it('не содержит пропусков и дубликатов координат', () => {
    for (const tier of BEACON_TIERS) {
      const placements = beaconPyramid(tier)
      const cells = placements.map(({ x, y, z }) => `${x},${y},${z}`)
      expect(new Set(cells).size).toBe(cells.length)
      for (let layer = 0; layer < tier; layer++) {
        const size = 2 * (tier - layer) + 1
        expect(placements.filter((entry) => entry.y === layer)).toHaveLength(size ** 2)
      }
    }
  })
})
