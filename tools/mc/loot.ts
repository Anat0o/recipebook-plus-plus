/**
 * Интерпретатор таблиц добычи Minecraft.
 *
 * Считает для каждого предмета вероятность выпадения и матожидание количества
 * при заданных условиях (Удача/Добыча, убийство игроком, шёлковое касание).
 * Условия, которые нельзя выразить числом (тип урона, состояние блока, погода),
 * не отбрасываются, а превращаются в человекочитаемые пометки.
 */
import * as D from './dist.ts'
import type { TagIndex } from './tags.ts'

export interface LootContext {
  /** Уровень Удачи (для блоков). */
  fortune: number
  /** Уровень Добычи (для мобов). */
  looting: number
  killedByPlayer: boolean
  silkTouch: boolean
}

export const DEFAULT_CONTEXT: LootContext = {
  fortune: 0,
  looting: 0,
  killedByPlayer: true,
  silkTouch: false,
}

export interface Drop {
  chance: number
  expected: number
  conditions: Set<string>
}

export interface LootDeps {
  /** Доступ к другим таблицам для записей типа `loot_table`. */
  table: (id: string) => unknown | null
  itemTags: TagIndex
  /** Типы условий и функций, которые встретились, но не поддержаны. */
  unknown: Set<string>
}

/** Итог: id предмета → характеристики выпадения. */
export type LootResult = Map<string, Drop>

export function evaluateTable(table: any, ctx: LootContext, deps: LootDeps, depth = 0): LootResult {
  const result: LootResult = new Map()
  if (!table || depth > 8) return result

  for (const pool of table.pools ?? []) {
    const poolCond = evaluateConditions(pool.conditions, ctx, deps)
    if (poolCond.p === 0) continue

    const rolls = D.mean(numberProvider(pool.rolls, ctx))
    const perRoll = evaluateEntries(pool.entries ?? [], ctx, deps, depth)

    for (const [id, dist] of perRoll) {
      // Каждый бросок пула независим, поэтому распределения складываются.
      const total = D.withProbability(D.repeat(dist, rolls), poolCond.p)
      mergeDrop(result, id, total, new Set([...poolCond.labels]))
    }
  }

  return result
}

/** Раздаёт вероятность выбора по весам записей и возвращает распределение на один бросок. */
function evaluateEntries(entries: any[], ctx: LootContext, deps: LootDeps, depth: number): Map<string, D.Dist> {
  const out = new Map<string, D.Dist>()

  // Веса считаются только по записям, чьи условия в принципе выполнимы.
  const usable = entries.map((entry) => ({ entry, cond: evaluateConditions(entry.conditions, ctx, deps) }))
  const totalWeight = usable.reduce(
    (sum, { entry, cond }) => sum + (cond.p > 0 ? weightOf(entry, ctx) : 0),
    0,
  )

  for (const { entry, cond } of usable) {
    if (cond.p === 0) continue
    const share = totalWeight > 0 ? weightOf(entry, ctx) / totalWeight : 1
    const selection = share * cond.p

    for (const [id, dist] of evaluateEntry(entry, ctx, deps, depth)) {
      const scaled = D.withProbability(dist, selection)
      out.set(id, out.has(id) ? D.add(out.get(id)!, scaled) : scaled)
    }
  }

  return out
}

function evaluateEntry(entry: any, ctx: LootContext, deps: LootDeps, depth: number): Map<string, D.Dist> {
  const out = new Map<string, D.Dist>()
  const type: string = entry.type ?? 'minecraft:item'

  switch (type) {
    case 'minecraft:item': {
      const id = String(entry.name)
      out.set(id, applyFunctions(entry.functions, D.constant(1), ctx, deps))
      break
    }
    case 'minecraft:tag': {
      const ids = deps.itemTags.resolve(String(entry.name))
      // expand=true — каждый предмет отдельная запись с равным весом,
      // иначе выпадают все предметы тега разом.
      const share = entry.expand === false ? 1 : ids.length > 0 ? 1 / ids.length : 0
      for (const id of ids) {
        out.set(id, D.withProbability(applyFunctions(entry.functions, D.constant(1), ctx, deps), share))
      }
      break
    }
    case 'minecraft:loot_table': {
      const ref = typeof entry.value === 'string' ? entry.value : entry.name
      const nested = typeof ref === 'string' ? deps.table(ref) : ref
      for (const [id, drop] of evaluateTable(nested, ctx, deps, depth + 1)) {
        // Вложенная таблица уже свёрнута — восстанавливаем распределение
        // из шанса и среднего, точности для показа в UI достаточно.
        out.set(id, distFromDrop(drop))
      }
      break
    }
    case 'minecraft:alternatives': {
      // Берётся первая запись, чьи условия выполнились.
      let remaining = 1
      for (const child of entry.children ?? []) {
        const cond = evaluateConditions(child.conditions, ctx, deps)
        if (cond.p === 0) continue
        const take = remaining * cond.p
        for (const [id, dist] of evaluateEntry(child, ctx, deps, depth)) {
          const scaled = D.withProbability(dist, take)
          out.set(id, out.has(id) ? D.add(out.get(id)!, scaled) : scaled)
        }
        remaining -= take
        if (remaining <= 1e-9) break
      }
      break
    }
    case 'minecraft:group':
    case 'minecraft:sequence': {
      for (const child of entry.children ?? []) {
        const cond = evaluateConditions(child.conditions, ctx, deps)
        if (cond.p === 0) break
        for (const [id, dist] of evaluateEntry(child, ctx, deps, depth)) {
          const scaled = D.withProbability(dist, cond.p)
          out.set(id, out.has(id) ? D.add(out.get(id)!, scaled) : scaled)
        }
      }
      break
    }
    case 'minecraft:empty':
    case 'minecraft:dynamic':
      break
    default:
      deps.unknown.add(`entry:${type}`)
  }

  return out
}

function weightOf(entry: any, ctx: LootContext): number {
  const base = entry.weight ?? 1
  // quality сдвигает вес в зависимости от удачи игрока; удача как таковая у нас 0.
  return Math.max(0, base + (entry.quality ?? 0) * 0)
    || (entry.weight === undefined ? 1 : 0)
}

// ——— Условия ———

interface CondResult {
  p: number
  labels: Set<string>
}

function evaluateConditions(conditions: any[] | undefined, ctx: LootContext, deps: LootDeps): CondResult {
  const out: CondResult = { p: 1, labels: new Set() }
  for (const condition of conditions ?? []) {
    const res = evaluateCondition(condition, ctx, deps)
    out.p *= res.p
    for (const label of res.labels) out.labels.add(label)
    if (out.p === 0) break
  }
  return out
}

function evaluateCondition(condition: any, ctx: LootContext, deps: LootDeps): CondResult {
  const none = (p: number, label?: string): CondResult => ({
    p,
    labels: new Set(label ? [label] : []),
  })
  const type: string = condition.condition ?? condition.type

  switch (type) {
    case 'minecraft:random_chance':
      return none(D.mean(numberProvider(condition.chance, ctx)))

    case 'minecraft:random_chance_with_enchanted_bonus': {
      const level = ctx.looting || ctx.fortune
      const p = level > 0 ? levelBased(condition.enchanted_chance, level) : condition.unenchanted_chance ?? 0
      return none(p)
    }

    // Старая форма из версий до 1.21.
    case 'minecraft:random_chance_with_looting': {
      const p = (condition.chance ?? 0) + ctx.looting * (condition.looting_multiplier ?? 0)
      return none(Math.min(1, p))
    }

    case 'minecraft:killed_by_player':
      return none(ctx.killedByPlayer ? 1 : 0, 'killed_by_player')

    case 'minecraft:table_bonus': {
      const chances: number[] = condition.chances ?? []
      const level = Math.min(ctx.fortune, chances.length - 1)
      return none(chances[Math.max(0, level)] ?? 0)
    }

    case 'minecraft:match_tool': {
      const silk = requiresSilkTouch(condition.predicate)
      if (silk) return none(ctx.silkTouch ? 1 : 0, 'silk_touch')
      return none(1, toolLabel(condition.predicate))
    }

    case 'minecraft:survives_explosion':
      return none(1)

    case 'minecraft:inverted': {
      const inner = evaluateCondition(condition.term, ctx, deps)
      return { p: 1 - inner.p, labels: new Set([...inner.labels].map((l) => `not:${l}`)) }
    }

    case 'minecraft:any_of': {
      let pNone = 1
      const labels = new Set<string>()
      for (const term of condition.terms ?? []) {
        const inner = evaluateCondition(term, ctx, deps)
        pNone *= 1 - inner.p
        for (const l of inner.labels) labels.add(l)
      }
      return { p: 1 - pNone, labels }
    }

    case 'minecraft:all_of': {
      let p = 1
      const labels = new Set<string>()
      for (const term of condition.terms ?? []) {
        const inner = evaluateCondition(term, ctx, deps)
        p *= inner.p
        for (const l of inner.labels) labels.add(l)
      }
      return { p, labels }
    }

    // Условия, зависящие от обстановки: числом их не выразить, показываем текстом.
    case 'minecraft:entity_properties':
      return none(1, entityLabel(condition))
    case 'minecraft:damage_source_properties':
      return none(1, 'damage_source')
    case 'minecraft:block_state_property':
      return none(1, blockStateLabel(condition))
    case 'minecraft:location_check':
      return none(1, 'location')
    case 'minecraft:weather_check':
      return none(1, 'weather')
    case 'minecraft:time_check':
      return none(1, 'time')
    case 'minecraft:value_check':
      return none(1, 'score')
    case 'minecraft:enchantment_active_check':
      return none(1, 'enchantment_active')

    default:
      deps.unknown.add(`condition:${type}`)
      return none(1, 'extra')
  }
}

function requiresSilkTouch(predicate: any): boolean {
  const enchantments = predicate?.predicates?.['minecraft:enchantments'] ?? predicate?.enchantments
  if (!Array.isArray(enchantments)) return false
  return enchantments.some((e: any) => String(e.enchantments ?? e.enchantment ?? '').includes('silk_touch'))
}

/** Ключи, а не готовый текст: перевод живёт на стороне сайта. */
function toolLabel(predicate: any): string {
  const items = predicate?.items
  if (typeof items === 'string') return `tool:${items.replace('minecraft:', '').replace('#', '')}`
  return 'tool'
}

function entityLabel(condition: any): string {
  const entity = condition.entity ?? 'this'
  if (entity === 'killer') return 'killer'
  if (entity === 'direct_killer') return 'projectile'
  return 'entity_state'
}

function blockStateLabel(condition: any): string {
  const props = condition.properties ?? {}
  const parts = Object.entries(props).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
  return parts.length > 0 ? `block_state:${parts.join(',')}` : 'block_state'
}

// ——— Функции ———

function applyFunctions(functions: any[] | undefined, base: D.Dist, ctx: LootContext, deps: LootDeps): D.Dist {
  let dist = base
  for (const fn of functions ?? []) {
    const cond = evaluateConditions(fn.conditions, ctx, deps)
    if (cond.p === 0) continue
    const applied = applyFunction(fn, dist, ctx, deps)
    // Функция с условием срабатывает лишь иногда — смешиваем оба исхода.
    dist = cond.p >= 1 ? applied : mix(applied, dist, cond.p)
  }
  return dist
}

function mix(a: D.Dist, b: D.Dist, weightA: number): D.Dist {
  const out: D.Dist = new Map()
  for (const [v, p] of a) out.set(v, (out.get(v) ?? 0) + p * weightA)
  for (const [v, p] of b) out.set(v, (out.get(v) ?? 0) + p * (1 - weightA))
  return out
}

function applyFunction(fn: any, dist: D.Dist, ctx: LootContext, deps: LootDeps): D.Dist {
  const type: string = fn.function ?? fn.type

  switch (type) {
    case 'minecraft:set_count': {
      const value = D.clampNonNegative(numberProvider(fn.count, ctx))
      return fn.add ? D.add(dist, value) : value
    }

    // Добыча/Удача: прибавляет значение, умноженное на уровень зачарования.
    case 'minecraft:enchanted_count_increase':
    case 'minecraft:looting_enchant': {
      const level = String(fn.enchantment ?? '').includes('fortune') ? ctx.fortune : ctx.looting
      if (level === 0) return dist
      const bonus = D.mapValues(numberProvider(fn.count ?? fn.value, ctx), (v) => Math.floor(v) * level)
      const limit = fn.limit ?? 0
      const sum = D.add(dist, D.clampNonNegative(bonus))
      return limit > 0 ? D.mapValues(sum, (v) => Math.min(v, limit)) : sum
    }

    case 'minecraft:apply_bonus':
      return applyBonus(fn, dist, ctx)

    case 'minecraft:limit_count': {
      const min = fn.limit?.min ?? -Infinity
      const max = fn.limit?.max ?? Infinity
      return D.mapValues(dist, (v) => Math.min(max, Math.max(min, v)))
    }

    // Не влияют на количество: меняют содержимое предмета или его вид.
    case 'minecraft:set_components':
    case 'minecraft:set_potion':
    case 'minecraft:set_nbt':
    case 'minecraft:set_damage':
    case 'minecraft:set_attributes':
    case 'minecraft:set_name':
    case 'minecraft:set_lore':
    case 'minecraft:enchant_randomly':
    case 'minecraft:enchant_with_levels':
    case 'minecraft:set_enchantments':
    case 'minecraft:set_book_cover':
    case 'minecraft:set_written_book_pages':
    case 'minecraft:set_custom_data':
    case 'minecraft:set_instrument':
    case 'minecraft:exploration_map':
    case 'minecraft:set_stew_effect':
    case 'minecraft:set_banner_pattern':
    case 'minecraft:set_ominous_bottle_amplifier':
    case 'minecraft:copy_components':
    case 'minecraft:copy_custom_data':
    case 'minecraft:copy_name':
    case 'minecraft:copy_state':
    case 'minecraft:filtered':
    case 'minecraft:reference':
    case 'minecraft:sequence':
    case 'minecraft:toggle_tooltips':
    case 'minecraft:modify_contents':
      return dist

    // Взрыв и переплавка меняют не количество, а судьбу предмета.
    case 'minecraft:explosion_decay':
    case 'minecraft:furnace_smelt':
      return dist

    default:
      deps.unknown.add(`function:${type}`)
      return dist
  }
}

function applyBonus(fn: any, dist: D.Dist, ctx: LootContext): D.Dist {
  const level = String(fn.enchantment ?? '').includes('looting') ? ctx.looting : ctx.fortune
  const formula: string = fn.formula ?? ''

  if (formula.includes('ore_drops')) {
    // Ванильная формула: множитель = max(0, rand(-1 … fortune)) + 1.
    const outcomes: D.Dist = new Map()
    const n = level + 2
    for (let i = -1; i < level + 1; i++) {
      const mult = Math.max(0, i) + 1
      outcomes.set(mult, (outcomes.get(mult) ?? 0) + 1 / n)
    }
    return D.multiply(dist, outcomes)
  }

  if (formula.includes('uniform_bonus_count')) {
    const multiplier = fn.parameters?.bonusMultiplier ?? 1
    return D.add(dist, D.uniformInt(0, multiplier * level))
  }

  if (formula.includes('binomial_with_bonus_count')) {
    const extra = fn.parameters?.extra ?? 0
    const probability = fn.parameters?.probability ?? 0.5
    return D.add(dist, D.binomial(extra + level, probability))
  }

  return dist
}

// ——— Поставщики чисел ———

function numberProvider(value: any, ctx: LootContext): D.Dist {
  if (value === undefined || value === null) return D.constant(1)
  if (typeof value === 'number') return D.constant(value)

  const type: string = value.type ?? 'minecraft:uniform'
  switch (type) {
    case 'minecraft:constant':
      return D.constant(value.value ?? 0)
    case 'minecraft:uniform':
      return D.uniformInt(D.mean(numberProvider(value.min, ctx)), D.mean(numberProvider(value.max, ctx)))
    case 'minecraft:binomial':
      return D.binomial(D.mean(numberProvider(value.n, ctx)), D.mean(numberProvider(value.p, ctx)))
    case 'minecraft:enchantment_level':
      return D.constant(levelBased(value.amount, Math.max(ctx.fortune, ctx.looting)))
    default:
      // score / storage зависят от мира — берём единицу как нейтральное значение.
      return D.constant(1)
  }
}

/** Значение, зависящее от уровня зачарования. */
function levelBased(value: any, level: number): number {
  if (typeof value === 'number') return value
  const type: string = value?.type ?? 'minecraft:linear'
  if (type.includes('clamped')) {
    const inner = levelBased(value.value, level)
    return Math.min(value.max ?? Infinity, Math.max(value.min ?? -Infinity, inner))
  }
  if (type.includes('fraction')) {
    return levelBased(value.numerator, level) / Math.max(1e-9, levelBased(value.denominator, level))
  }
  if (type.includes('levels_squared')) return (value.added ?? 0) + level * level
  if (type.includes('lookup')) {
    const values: number[] = value.values ?? []
    return values[level - 1] ?? levelBased(value.fallback, level)
  }
  // linear
  return (value.base ?? 0) + (level - 1) * (value.per_level_above_first ?? 0)
}

// ——— Сборка результата ———

function distFromDrop(drop: Drop): D.Dist {
  if (drop.chance <= 0) return D.constant(0)
  const perHit = drop.expected / drop.chance
  return new Map([
    [0, 1 - drop.chance],
    [perHit, drop.chance],
  ])
}

function mergeDrop(result: LootResult, id: string, dist: D.Dist, labels: Set<string>): void {
  const chance = D.pPositive(dist)
  const expected = D.mean(dist)
  const existing = result.get(id)
  if (!existing) {
    result.set(id, { chance, expected, conditions: labels })
    return
  }
  // Пулы независимы: вероятности объединяются, средние складываются.
  existing.chance = 1 - (1 - existing.chance) * (1 - chance)
  existing.expected += expected
  for (const label of labels) existing.conditions.add(label)
}
