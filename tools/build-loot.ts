/**
 * Превращает таблицы добычи в источники для страницы предмета.
 *
 * Для каждой таблицы считаем базовый случай и, если таблица чувствительна
 * к Удаче/Добыче, — ряд значений по уровням 0…3 для слайдера в интерфейсе.
 */
import type { LootContext as ItemLootContext, Source } from '../src/lib/schema.ts'
import { evaluateTable, type LootContext, type LootDeps, type LootResult } from './mc/loot.ts'
import { LootRepository, context } from './mc/loot-repo.ts'
import type { TagIndex } from './mc/tags.ts'

const MAX_ENCHANT_LEVEL = 3

interface Classified {
  context: ItemLootContext
  origin: string
  /** Для блоков имеет смысл шёлковое касание, для мобов — Добыча. */
  enchantment: 'fortune' | 'looting' | null
}

function classify(path: string): Classified {
  const [head, ...rest] = path.split('/')
  const origin = rest.join('/') || head || path
  switch (head) {
    case 'blocks':    return { context: 'block', origin, enchantment: 'fortune' }
    case 'entities':  return { context: 'entity', origin, enchantment: 'looting' }
    case 'chests':    return { context: 'chest', origin, enchantment: null }
    case 'gameplay':  return { context: 'gameplay', origin, enchantment: null }
    case 'archaeology': return { context: 'archaeology', origin, enchantment: null }
    case 'brush':     return { context: 'archaeology', origin, enchantment: null }
    case 'shearing':  return { context: 'shearing', origin, enchantment: null }
    case 'harvest':   return { context: 'harvest', origin, enchantment: null }
    case 'spawners':  return { context: 'spawner', origin, enchantment: null }
    case 'dispensers':return { context: 'dispenser', origin, enchantment: null }
    case 'pots':      return { context: 'pot', origin, enchantment: null }
    case 'equipment': return { context: 'equipment', origin, enchantment: null }
    default:          return { context: 'other', origin: path, enchantment: null }
  }
}

export interface LootBuildResult {
  sources: Source[]
  tableCount: number
  unknown: string[]
}

export function buildLoot(dataRoot: string, itemTags: TagIndex): LootBuildResult {
  const repo = new LootRepository(dataRoot)
  const unknown = new Set<string>()
  const deps: LootDeps = { table: (id) => repo.get(id), itemTags, unknown }

  const sources: Source[] = []
  const tables = repo.list()

  for (const { path, json } of tables) {
    const info = classify(path)
    const variants: { ctx: Partial<LootContext>; note?: string }[] =
      info.context === 'block'
        ? [{ ctx: {} }, { ctx: { silkTouch: true }, note: 'silk_touch' }]
        : [{ ctx: {} }]

    const seen = new Set<string>()

    for (const variant of variants) {
      const base = evaluateTable(json, context(variant.ctx), deps)
      for (const [itemId, drop] of base) {
        if (drop.chance <= 0) continue
        // Вариант с шёлком добавляем только если он что-то меняет.
        const key = `${itemId}|${drop.chance.toFixed(6)}|${drop.expected.toFixed(6)}`
        if (seen.has(key)) continue
        seen.add(key)

        const conditions = [...drop.conditions]
        if (variant.note) conditions.push(variant.note)

        sources.push({
          kind: 'loot',
          table: path,
          context: info.context,
          origin: info.origin,
          result: { id: itemId },
          chance: drop.chance,
          expected: drop.expected,
          byLevel: info.enchantment
            ? levelSeries(json, itemId, info.enchantment, variant.ctx, deps)
            : undefined,
          conditions,
          // «Ломаешь блок — получаешь его же» без единого условия не сообщает
          // ничего. Помечаем, а не выбрасываем: для части блоков это
          // единственный способ добычи, и там карточка должна остаться.
          // origin приходит из пути таблицы («dirt»), а itemId — из записи
          // с префиксом («minecraft:dirt»), поэтому сравниваем нормализованные.
          selfDrop:
            info.context === 'block' &&
            info.origin === itemId.replace(/^minecraft:/, '') &&
            conditions.length === 0
              ? true
              : undefined,
        })
      }
    }
  }

  return { sources, tableCount: tables.length, unknown: [...unknown] }
}

/** Ряд «шанс и среднее по уровню зачарования», null если уровень ничего не меняет. */
function levelSeries(
  table: unknown,
  itemId: string,
  enchantment: 'fortune' | 'looting',
  baseCtx: Partial<LootContext>,
  deps: LootDeps,
): { enchantment: 'fortune' | 'looting'; chance: number[]; expected: number[] } | undefined {
  const chance: number[] = []
  const expected: number[] = []

  for (let level = 0; level <= MAX_ENCHANT_LEVEL; level++) {
    const result: LootResult = evaluateTable(table, context({ ...baseCtx, [enchantment]: level }), deps)
    const drop = result.get(itemId)
    chance.push(drop?.chance ?? 0)
    expected.push(drop?.expected ?? 0)
  }

  const varies = chance.some((c) => Math.abs(c - chance[0]!) > 1e-9)
    || expected.some((e) => Math.abs(e - expected[0]!) > 1e-9)
  return varies ? { enchantment, chance, expected } : undefined
}
