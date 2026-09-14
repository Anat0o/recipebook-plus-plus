/** Generate an isolated Java datapack from the same curated schematic data. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ALL_GUIDES } from './build-guides.ts'
import { toPlacements } from './mc/placements.ts'
import type { Placement } from './curated/guides/types.ts'

const world = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('usage: tsx tools/generate-guide-smoke.ts <world-directory>')
const root = join(world, 'datapacks', 'recipebook-guide-smoke')
const functions = join(root, 'data', 'recipebook', 'function')
mkdirSync(functions, { recursive: true })
writeFileSync(join(root, 'pack.mcmeta'), JSON.stringify({ pack: { min_format: [107, 1], max_format: 107, description: 'RecipeBook++ generated guide smoke 26.2' } }, null, 2))

const stateId = (placement: Placement): string => {
  const id = placement.block === 'redstone' ? 'redstone_wire' : placement.block
  const properties: string[] = []
  if (placement.facing && ['piston', 'sticky_piston', 'observer', 'hopper', 'dispenser', 'furnace', 'repeater', 'comparator', 'beehive', 'iron_door', 'oak_door'].includes(id)) properties.push(`facing=${placement.facing}`)
  for (const atom of placement.variant?.split('+') ?? []) {
    const delay = /^delay_([1-4])$/.exec(atom)
    const explicit = /^(half|part|age)=([a-z0-9_]+)$/.exec(atom)
    if (delay && id === 'repeater') properties.push(`delay=${delay[1]}`)
    if (explicit) properties.push(`${explicit[1]}=${explicit[2]}`)
  }
  return `minecraft:${id}${properties.length ? `[${properties.join(',')}]` : ''}`
}

const calls: string[] = ['scoreboard objectives add rb_smoke dummy', 'scoreboard players set failures rb_smoke 0']
let index = 0
for (const guide of ALL_GUIDES) {
  for (const schematic of guide.schematics) {
    const name = `${guide.id}_${index}`
    const lines: string[] = []
    for (const placement of toPlacements(schematic.layers)) {
      const id = stateId(placement)
      lines.push(`setblock ~${placement.x} ~${placement.y} ~${placement.z} ${id}`)
      lines.push(`execute unless block ~${placement.x} ~${placement.y} ~${placement.z} minecraft:${placement.block === 'redstone' ? 'redstone_wire' : placement.block} run scoreboard players add failures rb_smoke 1`)
    }
    for (const entity of schematic.entities ?? []) {
      if (entity.type === 'item') continue
      const type = entity.type === 'hopper_minecart' ? 'hopper_minecart' : entity.type
      lines.push(`summon minecraft:${type} ~${entity.x} ~${entity.y} ~${entity.z} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["recipebook_smoke"]}`)
    }
    writeFileSync(join(functions, `${name}.mcfunction`), `${lines.join('\n')}\n`)
    const x = (index % 6) * 40
    const z = Math.floor(index / 6) * 48
    calls.push(`execute positioned ${x} 160 ${z} run function recipebook:${name}`)
    index += 1
  }
}
calls.push('execute if score failures rb_smoke matches 0 run say RECIPEBOOK_GUIDE_SMOKE_OK')
calls.push('execute unless score failures rb_smoke matches 0 run say RECIPEBOOK_GUIDE_SMOKE_FAILED')
writeFileSync(join(functions, 'all.mcfunction'), `${calls.join('\n')}\n`)
console.log(`generated ${index} schematic stands in ${root}`)
