/**
 * Многоблочные постройки: Визер, големы, маяк, портал.
 *
 * Проверяем два условия: каждый блок схемы существует в этой версии, и у
 * постройки есть хотя бы один участник — иначе врезать её в карточки некуда.
 */
import { MULTIBLOCKS, type Multiblock } from './curated/multiblocks.ts'
import { blocksIn, meshKeysIn, toPlacements } from './mc/placements.ts'
import type { Placement } from './curated/guides/types.ts'

export interface MultiblockData {
  id: string
  names: Record<string, string>
  notes: Record<string, string>
  icon: string
  /** Трёхмерная постройка: где какой блок и на каком шаге ставится. */
  placements: Placement[]
  steps: Record<string, string>[]
  /** Предметы, у которых постройка появится в разделе «Использование». */
  parts: string[]
}

export function buildMultiblocks(knownItems: Set<string>): {
  data: MultiblockData[]
  problems: string[]
} {
  const problems: string[] = []
  const data: MultiblockData[] = []

  for (const entry of MULTIBLOCKS) {
    const parts = blocksOf(entry)
    const missing = [...parts, entry.icon, ...(entry.requires ?? [])].filter(
      (id) => !knownItems.has(id),
    )
    if (missing.length > 0) {
      // В старой версии постройки могло ещё не быть — это не ошибка сборки.
      problems.push(`постройка ${entry.id}: в версии нет ${missing.join(', ')}`)
      continue
    }

    // Шаг — это кнопка, показывающая свою часть постройки: описаний должно
    // быть ровно столько же, сколько уровней, иначе текст разъедется с картинкой.
    const placements = toPlacements(entry.layers.map((grid) => ({ grid })))
    const steps = Math.max(0, ...placements.map((placement) => placement.step))
    if (steps !== entry.steps.length) {
      problems.push(`постройка ${entry.id}: описаний ${entry.steps.length}, уровней ${steps}`)
      continue
    }

    data.push({
      id: entry.id,
      names: { ru: entry.ru, en: entry.en },
      notes: { ru: entry.ruNote, en: entry.enNote },
      icon: entry.icon,
      placements,
      steps: entry.steps.map((step) => ({ ru: step.ru, en: step.en })),
      parts: [...parts],
    })
  }

  return { data, problems }
}

/** Уникальные блоки схемы. */
function blocksOf(entry: Multiblock): Set<string> {
  return blocksIn(entry.layers.map((grid) => ({ grid })))
}

/** Пары «блок + направление» из всех построек: для них нужна геометрия. */
export function multiblockBlocks(): Set<string> {
  const keys = new Set<string>()
  for (const entry of MULTIBLOCKS) {
    for (const key of meshKeysIn(entry.layers.map((grid) => ({ grid })))) keys.add(key)
  }
  return keys
}
