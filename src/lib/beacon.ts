import type { Placement } from './webgl.ts'

export type BeaconTier = 1 | 2 | 3 | 4

export const BEACON_TIERS: BeaconTier[] = [1, 2, 3, 4]

/** Число минеральных блоков во всех слоях пирамиды выбранного уровня. */
export function beaconMineralCount(tier: BeaconTier): number {
  let count = 0
  for (let layer = 0; layer < tier; layer++) count += (2 * (tier - layer) + 1) ** 2
  return count
}

/** Полная центрированная пирамида; маяк ставится последним шагом. */
export function beaconPyramid(tier: BeaconTier): Placement[] {
  const placements: Placement[] = []
  for (let layer = 0; layer < tier; layer++) {
    const radius = tier - layer
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        placements.push({ x, y: layer, z, block: 'iron_block', step: layer + 1 })
      }
    }
  }
  placements.push({ x: 0, y: tier, z: 0, block: 'beacon', step: tier + 1 })
  return placements
}
