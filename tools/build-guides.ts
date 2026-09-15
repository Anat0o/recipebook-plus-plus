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

/** Блоки мира, которые не расходуют одноимённый предмет при строительстве. */
const MATERIAL_ALIAS: Record<string, string | null> = {
  water: null,
  lava: null,
  bubble_column: null,
  spawner: null,
  farmland: 'dirt',
  wheat: 'wheat_seeds',
  melon_stem: 'melon_seeds',
}

/**
 * Точный предметный состав одной схемы.
 *
 * Дверь и кровать занимают две клетки мира, но ставятся одним предметом.
 * Жидкости, существующий спаунер и пузырьковая колонна учитываются отдельными
 * требованиями исходного гайда, а не числом клеток на разрезе.
 */
export function placedMaterials(placements: Placement[]): Map<string, number> {
  const blocks = new Map<string, number>()
  for (const placement of placements) {
    const item = Object.hasOwn(MATERIAL_ALIAS, placement.block)
      ? MATERIAL_ALIAS[placement.block]
      : placement.block
    if (!item) continue
    blocks.set(item, (blocks.get(item) ?? 0) + 1)
    for (const stack of placement.inventory ?? []) {
      blocks.set(stack.id, (blocks.get(stack.id) ?? 0) + stack.count)
    }
  }

  for (const [id, count] of [...blocks]) {
    if (id.endsWith('_door') || id.endsWith('_bed')) blocks.set(id, Math.ceil(count / 2))
  }
  return blocks
}

/** Материалы, достаточные для всей постройки или любого одного её варианта. */
export function guideMaterials(guide: Guide): { id: string; count: number }[] {
  const placements = guide.schematics.map((schematic) => toPlacements(schematic.layers))
  const builds = placements.map(placedMaterials)
  const exact = new Map<string, number>()
  for (const build of builds) {
    for (const [id, count] of build) {
      const previous = exact.get(id) ?? 0
      exact.set(id, guide.buildMode === 'alternatives' ? Math.max(previous, count) : previous + count)
    }
  }

  // То, чего нет клеткой в готовой постройке: вёдра, временные факелы,
  // вагонетка, ножницы, бутылки и другие расходники подготовки.
  for (const declared of guide.materials) {
    if (declared.id === 'farmland' || exact.has(declared.id)) continue
    exact.set(declared.id, declared.count)
  }

  // Грядки создаются из земли инструментом; сам блок farmland получить нельзя.
  if (placements.some((build) => build.some((placement) => placement.block === 'farmland'))) {
    exact.set('wooden_hoe', Math.max(1, exact.get('wooden_hoe') ?? 0))
  }

  return [...exact].map(([id, count]) => ({ id, count }))
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
      materials: guideMaterials(guide),
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
