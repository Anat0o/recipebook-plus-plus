/**
 * Гайды по фермам и редстоуну.
 *
 * Сборка следит за одним: каждый блок, упомянутый в схеме или в списке
 * материалов, существует в этой версии игры. Схема с несуществующим блоком —
 * это молча неверная инструкция, поэтому такой гайд в версию не попадает.
 */
import { FARM_GUIDES } from './curated/guides/farms.ts'
import { REDSTONE_GUIDES } from './curated/guides/redstone.ts'
import type { AnimationSpec, EntitySpec, Guide, Placement } from './curated/guides/types.ts'
import { blocksIn, meshKeysIn, toPlacements } from './mc/placements.ts'
import { BLOCKS_WITHOUT_ITEM } from './curated/block-models.ts'

export const ALL_GUIDES: Guide[] = [...FARM_GUIDES, ...REDSTONE_GUIDES]

export interface GuideData {
  id: string
  category: Guide['category']
  names: Record<string, string>
  summaries: Record<string, string>
  icon: string
  editions: Guide['editions']
  materials: { id: string; count: number }[]
  /** Трёхмерная постройка: где какой блок и на каком шаге ставится. */
  builds: {
    names: Record<string, string>
    /** Действия по шагам — они же кнопки, переключающие вид. */
    steps: Record<string, string>[]
    placements: Placement[]
    entities: EntitySpec[]
    animation?: AnimationSpec
  }[]
  notes: Record<string, string[]>
}

export function buildGuides(knownItems: Set<string>): {
  data: GuideData[]
  problems: string[]
} {
  const problems: string[] = []
  const data: GuideData[] = []

  for (const guide of ALL_GUIDES) {
    const missing = [...blocksOf(guide)].filter((id) => !knownItems.has(id) && !BLOCKS_WITHOUT_ITEM.has(id))
    if (missing.length > 0) {
      problems.push(`гайд ${guide.id}: в версии нет ${missing.join(', ')}`)
      continue
    }

    // Шаг — это кнопка, которая показывает свою часть постройки. Если
    // описаний и ступеней разное число, кнопки разъедутся с постройкой, и
    // читатель увидит текст от одного шага при картинке другого.
    const mismatched = guide.schematics
      .map((schematic) => {
        const steps = Math.max(0, ...toPlacements(schematic.layers).map((p) => p.step))
        return steps === schematic.steps.length
          ? null
          : `«${schematic.ru}»: описаний ${schematic.steps.length}, ступеней ${steps}`
      })
      .filter((problem): problem is string => problem !== null)
    if (mismatched.length > 0) {
      problems.push(`гайд ${guide.id}: ${mismatched.join('; ')}`)
      continue
    }

    data.push({
      id: guide.id,
      category: guide.category,
      names: { ru: guide.ru, en: guide.en },
      summaries: { ru: guide.ruSummary, en: guide.enSummary },
      icon: guide.icon,
      editions: guide.editions,
      materials: guide.materials,
      builds: guide.schematics.map((schematic) => {
        const placements = toPlacements(schematic.layers)
        const animation = schematic.animation ?? (guide.category === 'redstone' ? inputCycle(placements) : undefined)
        return {
          names: { ru: schematic.ru, en: schematic.en },
          steps: schematic.steps.map((step) => ({ ru: step.ru, en: step.en })),
          placements,
          entities: schematic.entities ?? [],
          ...(animation ? { animation } : {}),
        }
      }),
      notes: { ru: guide.ruNotes, en: guide.enNotes },
    })
  }

  return { data, problems }
}

/** Default deterministic Gray-code cycle exercises every interactive input. */
function inputCycle(placements: Placement[]): AnimationSpec {
  const inputs = placements.filter((entry) =>
    ['lever', 'stone_button', 'oak_button', 'stone_pressure_plate', 'oak_pressure_plate', 'daylight_detector'].includes(entry.block),
  )
  const events: AnimationSpec['events'] = []
  if (inputs.length === 0) return { duration: 24, loop: true, events }
  const combinations = 1 << Math.min(inputs.length, 4)
  let previous = 0
  for (let index = 1; index <= combinations; index += 1) {
    const gray = (index ^ (index >> 1)) % combinations
    const changed = previous ^ gray
    const bit = Math.max(0, Math.floor(Math.log2(changed || 1)))
    const input = inputs[bit]!
    events.push({ tick: index * 8, type: 'press', x: input.x, y: input.y, z: input.z })
    previous = gray
  }
  return { duration: combinations * 8 + 4, loop: true, events }
}

/** Все идентификаторы, которые гайд обещает читателю показать. */
function blocksOf(guide: Guide): Set<string> {
  const ids = new Set<string>([guide.icon, ...(guide.requires ?? [])])
  for (const material of guide.materials) ids.add(material.id)
  for (const schematic of guide.schematics) {
    for (const id of blocksIn(schematic.layers)) ids.add(id)
  }
  return ids
}

/** Пары «блок + направление» из схем: для них нужна геометрия. */
export function schematicBlocks(guides: Guide[]): Set<string> {
  const keys = new Set<string>()
  for (const guide of guides) {
    for (const schematic of guide.schematics) {
      for (const key of meshKeysIn(schematic.layers)) keys.add(key)
    }
  }
  return keys
}
