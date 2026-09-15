import { describe, expect, it } from 'vitest'
import { Redstone, type SimBlock } from './redstone.ts'
import { REDSTONE_GUIDES } from '../../tools/curated/guides/redstone.ts'
import { toPlacements } from '../../tools/mc/placements.ts'

const block = (x: number, block: string, facing?: string, variant?: string, y = 0, z = 0): SimBlock => ({ x, y, z, block, facing, variant, step: 1 })

describe('redstone simulator', () => {
  it.each([1, 2, 3, 4])('respects repeater delay %i', (delay) => {
    const sim = new Redstone([
      block(0, 'lever'),
      block(1, 'repeater', 'east', `delay_${delay}`),
      block(2, 'redstone_lamp'),
    ])
    sim.press('0,0,0')
    for (let tick = 1; tick < delay; tick += 1) {
      sim.tick()
      expect(sim.signalAt(1, 0, 0)).toBe(0)
    }
    sim.tick()
    expect(sim.signalAt(1, 0, 0)).toBe(15)
  })

  it('respects repeater delay and reset is deterministic', () => {
    const sim = new Redstone([
      block(0, 'lever'),
      block(1, 'repeater', 'east', 'delay_4'),
      block(2, 'redstone_lamp'),
    ])
    const initial = sim.snapshot()
    sim.press('0,0,0')
    for (let tick = 0; tick < 3; tick += 1) {
      sim.tick()
      expect(sim.signalAt(1, 0, 0)).toBe(0)
    }
    sim.tick()
    expect(sim.signalAt(1, 0, 0)).toBe(15)
    sim.reset()
    expect(sim.snapshot()).toBe(initial)
  })

  it('reads exact comparator container levels', () => {
    const sim = new Redstone([
      block(0, 'hopper', 'down'),
      block(1, 'comparator', 'east'),
      block(2, 'redstone'),
    ])
    sim.setContainerSignal(0, 0, 0, 7)
    sim.tick(); sim.tick()
    expect(sim.signalAt(1, 0, 0)).toBe(7)
    expect(sim.signalAt(2, 0, 0)).toBe(7)
  })

  it('moves real items through an unpowered hopper and updates comparator fullness', () => {
    const sim = new Redstone([
      { ...block(0, 'hopper', 'east'), inventory: [{ id: 'iron_ingot', count: 2 }] },
      block(1, 'chest'),
      block(-1, 'comparator', 'west'),
    ])
    expect(sim.containerSignalAt(0, 0, 0)).toBe(1)
    for (let tick = 0; tick < 8; tick += 1) sim.tick()
    expect(sim.inventoryCountAt(0, 0, 0, 'iron_ingot')).toBe(0)
    expect(sim.inventoryCountAt(1, 0, 0, 'iron_ingot')).toBe(2)
    expect(sim.containerSignalAt(0, 0, 0)).toBe(0)
  })

  it('a powered hopper is locked', () => {
    const sim = new Redstone([
      block(0, 'lever'),
      { ...block(1, 'hopper', 'east'), inventory: [{ id: 'iron_ingot', count: 1 }] },
      block(2, 'chest'),
    ])
    sim.press('0,0,0')
    for (let tick = 0; tick < 12; tick += 1) sim.tick()
    expect(sim.inventoryCountAt(1, 0, 0, 'iron_ingot')).toBe(1)
    expect(sim.inventoryCountAt(2, 0, 0, 'iron_ingot')).toBe(0)
  })

  it('observer emits only after an external block change', () => {
    const sim = new Redstone([
      block(0, 'observer', 'east'),
      block(-1, 'redstone'),
    ])
    expect(sim.signalAt(-1, 0, 0)).toBe(0)
    sim.setBlock(1, 0, 0, 'bamboo')
    sim.tick(); sim.tick()
    expect(sim.signalAt(-1, 0, 0)).toBeGreaterThan(0)
    sim.tick(); sim.tick()
    expect(sim.signalAt(-1, 0, 0)).toBe(0)
  })

  it('supports Java quasi-connectivity for a piston', () => {
    const sim = new Redstone([
      block(0, 'piston', 'east'),
      block(0, 'stone', undefined, undefined, 1, 0),
      block(1, 'lever', undefined, 'floor', 1, 0),
    ])
    sim.press('1,1,0')
    sim.tick()
    expect(sim.signalAt(0, 0, 0)).toBe(15)
  })

  it('does not pull a pushed block back with a normal piston', () => {
    const sim = new Redstone([
      block(0, 'lever'),
      block(1, 'piston', 'east'),
      block(2, 'polished_andesite'),
    ])
    const doorBlockAt = (x: number): boolean => sim.frame().some(
      (entry) => entry.block === 'polished_andesite' && entry.x === x,
    )

    sim.press('0,0,0'); sim.tick()
    expect(doorBlockAt(3)).toBe(true)
    sim.press('0,0,0'); sim.tick()
    expect(doorBlockAt(3)).toBe(true)
    expect(doorBlockAt(2)).toBe(false)
  })

  it('does not move Java container block entities with a piston', () => {
    for (const container of ['hopper', 'chest', 'furnace']) {
      const sim = new Redstone([
        block(0, 'lever'),
        block(1, 'piston', 'east'),
        block(2, container),
      ])
      sim.press('0,0,0'); sim.tick()
      expect(sim.signalAt(1, 0, 0), container).toBe(0)
      expect(sim.frame().some((entry) => entry.block === container && entry.x === 2), container).toBe(true)
    }
  })
})

function schematic(id: string, index = 0): SimBlock[] {
  const guide = REDSTONE_GUIDES.find((entry) => entry.id === id)
  if (!guide) throw new Error(`missing guide ${id}`)
  return toPlacements(guide.schematics[index]!.layers)
}

function settle(sim: Redstone, ticks = 12): void {
  for (let tick = 0; tick < ticks; tick += 1) sim.tick()
}

describe('published redstone guides', () => {
  it('closes and reopens the 2x2 doorway with four sticky pistons', () => {
    const placements = schematic('piston_door')
    const sim = new Redstone(placements)
    const doorBlocks = (): string[] => sim.frame()
      .filter((entry) => entry.block === 'polished_andesite')
      .map((entry) => `${entry.x},${entry.y},${entry.z}`)
      .sort()

    expect(doorBlocks()).toEqual(['2,1,1', '2,2,1', '5,1,1', '5,2,1'])
    sim.press('0,1,0')
    sim.tick()
    for (const piston of placements.filter((entry) => entry.block === 'sticky_piston')) {
      expect(sim.signalAt(piston.x, piston.y, piston.z)).toBe(15)
    }
    expect(doorBlocks()).toEqual(['3,1,1', '3,2,1', '4,1,1', '4,2,1'])
    sim.press('0,1,0')
    sim.tick()
    for (const piston of placements.filter((entry) => entry.block === 'sticky_piston')) {
      expect(sim.signalAt(piston.x, piston.y, piston.z)).toBe(0)
    }
    expect(doorBlocks()).toEqual(['2,1,1', '2,2,1', '5,1,1', '5,2,1'])
  })

  it('keeps the repeater ring oscillating after its starting pulse', () => {
    const placements = schematic('repeater_clock')
    const sim = new Redstone(placements)
    sim.press('1,1,1')
    const states = new Set<string>()
    for (let tick = 0; tick < 80; tick += 1) {
      sim.tick()
      states.add(placements.filter((entry) => entry.block === 'repeater')
        .map((entry) => sim.signalAt(entry.x, entry.y, entry.z)).join(','))
    }
    expect(states.has('0,0,0,0')).toBe(true)
    expect(states.size).toBeGreaterThan(4)
  })

  it('self-starts the face-to-face observer clock', () => {
    const placements = schematic('observer_clock')
    const sim = new Redstone(placements)
    const states = new Set<string>()
    for (let tick = 0; tick < 16; tick += 1) {
      sim.tick()
      states.add(placements.map((entry) => sim.signalAt(entry.x, entry.y, entry.z)).join(','))
    }
    expect(states.size).toBeGreaterThan(2)
  })

  it('passes complete truth tables for NOT, OR, AND and comparator subtraction', () => {
    const expected = [
      [true, false],
      [false, true, true, true],
      [false, false, false, true],
      [false, true, false, false],
    ]
    for (let build = 0; build < 4; build += 1) {
      const placements = schematic('logic_gates', build)
      const inputs = placements.filter((entry) => entry.block === 'lever')
      const lamp = placements.find((entry) => entry.block === 'redstone_lamp')!
      const actual: boolean[] = []
      for (let mask = 0; mask < 1 << inputs.length; mask += 1) {
        const sim = new Redstone(placements)
        inputs.forEach((input, bit) => {
          if (mask & (1 << bit)) sim.press(`${input.x},${input.y},${input.z}`)
        })
        settle(sim)
        actual.push(sim.signalAt(lamp.x, lamp.y, lamp.z) > 0)
      }
      expect(actual, REDSTONE_GUIDES.find((entry) => entry.id === 'logic_gates')!.schematics[build]!.en)
        .toEqual(expected[build])
    }
  })

  it('stores both RS latch states after the selecting lever is released', () => {
    const placements = schematic('rs_latch')
    const sim = new Redstone(placements)
    const inputs = placements.filter((entry) => entry.block === 'lever')
    const outputs = placements.filter((entry) => entry.block === 'redstone_torch')
    const read = (): number[] => outputs.map((entry) => sim.signalAt(entry.x, entry.y, entry.z))

    sim.press(`${inputs[1]!.x},${inputs[1]!.y},${inputs[1]!.z}`); settle(sim)
    sim.press(`${inputs[1]!.x},${inputs[1]!.y},${inputs[1]!.z}`); settle(sim)
    expect(read()).toEqual([15, 0])
    sim.press(`${inputs[0]!.x},${inputs[0]!.y},${inputs[0]!.z}`); settle(sim)
    sim.press(`${inputs[0]!.x},${inputs[0]!.y},${inputs[0]!.z}`); settle(sim)
    expect(read()).toEqual([0, 15])
  })

  it('keeps the pulse-extender output continuously high for 17 ticks', () => {
    const placements = schematic('pulse_extender')
    const sim = new Redstone(placements)
    const lamp = placements.find((entry) => entry.block === 'redstone_lamp')!
    const active: number[] = []
    for (let tick = 1; tick <= 26; tick += 1) {
      if (tick === 2) sim.press('0,1,0')
      sim.tick()
      if (sim.signalAt(lamp.x, lamp.y, lamp.z) > 0) active.push(tick)
    }
    expect(active).toEqual(Array.from({ length: 17 }, (_, index) => index + 2))
  })

  it('moves and returns the hidden entrance block', () => {
    const placements = schematic('hidden_entrance')
    const sim = new Redstone(placements)
    const stoneAt = (x: number): boolean => sim.frame().some((entry) => entry.block === 'stone' && entry.x === x && entry.y === 1 && entry.z === 0)
    expect(stoneAt(1)).toBe(true)
    sim.press('2,1,1'); sim.tick()
    expect(stoneAt(2)).toBe(true)
    sim.press('2,1,1'); sim.tick()
    expect(stoneAt(1)).toBe(true)
  })

  it('unlocks the item-filter hopper only above the configured level', () => {
    const sim = new Redstone(schematic('item_filter'))
    sim.setContainerSignal(3, 2, 1, 2); settle(sim, 8)
    expect(sim.signalAt(3, 2, 2)).toBe(2)
    expect(sim.signalAt(1, 1, 2)).toBe(0)
    expect(sim.signalAt(2, 1, 1)).toBe(15)
    sim.setContainerSignal(3, 2, 1, 3); settle(sim, 8)
    expect(sim.signalAt(1, 1, 2)).toBe(15)
    expect(sim.signalAt(2, 1, 1)).toBe(0)
  })

  it('routes matching items into the filter and lets a foreign item bypass it', () => {
    const guide = REDSTONE_GUIDES.find((entry) => entry.id === 'item_filter')!.schematics[0]!
    const sim = new Redstone(toPlacements(guide.layers))
    for (let tick = 1; tick <= guide.animation!.duration; tick += 1) {
      for (const event of guide.animation!.events.filter((entry) => entry.tick === tick)) {
        if (event.type === 'insert') sim.insertItem(event.x, event.y, event.z, event.item, event.count)
      }
      sim.tick()
    }

    expect(sim.inventoryCountAt(4, 1, 1, 'iron_ingot')).toBe(1)
    expect(sim.inventoryCountAt(4, 3, 1, 'cobblestone')).toBe(1)
    expect(sim.inventoryCountAt(3, 2, 1, 'iron_ingot')).toBe(41)
  })

  it('drains the one-shot hopper timer from actual items instead of scripted signal levels', () => {
    const guide = REDSTONE_GUIDES.find((entry) => entry.id === 'hopper_timer')!.schematics[0]!
    const sim = new Redstone(toPlacements(guide.layers))
    for (let tick = 1; tick <= guide.animation!.duration; tick += 1) {
      for (const event of guide.animation!.events.filter((entry) => entry.tick === tick)) {
        if (event.type === 'insert') sim.insertItem(event.x, event.y, event.z, event.item, event.count)
      }
      sim.tick()
    }
    expect(sim.inventoryCountAt(3, 1, 0)).toBe(0)
    expect(sim.inventoryCountAt(4, 1, 0, 'cobblestone')).toBe(8)
    expect(sim.containerSignalAt(3, 1, 0)).toBe(0)
    expect(sim.signalAt(0, 1, 0)).toBe(0)
  })
})
