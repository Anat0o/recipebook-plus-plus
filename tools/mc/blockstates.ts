/**
 * Блоксостояния: какую модель и с каким поворотом ставит игра.
 *
 * Выписывать повороты руками нельзя — там хватает неочевидного. У воронки,
 * повёрнутой вбок, вообще другая модель (`hopper_side`). У повторителя
 * `facing=east` это поворот на 270°, а не на 90°, потому что модель смотрит
 * назад относительно направления сигнала. Ровно на этом ручная таблица и
 * ошибалась, поэтому теперь ответ берётся из данных игры.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface StateVariant {
  model: string
  /** Поворот модели вокруг центра блока, в градусах. */
  x: number
  y: number
  /** UV остаются привязанными к миру, а не к модели. */
  uvlock: boolean
}

/**
 * Значения свойств «по умолчанию»: свежепоставленный блок без сигнала.
 * Ими выбирается вариант, когда у блока есть свойства помимо направления.
 */
const PREFERRED: Record<string, string> = {
  powered: 'false',
  lit: 'false',
  extended: 'false',
  locked: 'false',
  open: 'false',
  waterlogged: 'false',
  triggered: 'false',
  inverted: 'false',
  short: 'false',
  attached: 'false',
  eye: 'false',
  conditional: 'false',
  signal_fire: 'false',
  crafting: 'false',
  delay: '1',
  age: '0',
  stage: '0',
  level: '0',
  power: '0',
  honey_level: '0',
  bites: '0',
  charges: '0',
  half: 'bottom',
  hinge: 'left',
  part: 'foot',
  type: 'bottom',
  shape: 'straight',
  face: 'wall',
  mode: 'compare',
  leaves: 'none',
  axis: 'y',
  north: 'false',
  south: 'false',
  east: 'false',
  west: 'false',
  up: 'false',
  down: 'false',
}

export class BlockStates {
  constructor(private readonly assetsRoot: string) {}

  private readonly cache = new Map<string, unknown | null>()

  private read(block: string): any | null {
    if (this.cache.has(block)) return this.cache.get(block)
    const file = join(this.assetsRoot, 'blockstates', `${block}.json`)
    const json = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
    this.cache.set(block, json)
    return json
  }

  /**
   * Все части, которые игра рисует для блока в заданном состоянии.
   *
   * У обычного блока это одна модель, у составного (провод, забор) — несколько:
   * точка плюс отрезки в стороны. Условия считаются по данным игры, а не по
   * догадке: у провода, например, точка не рисуется на прямом участке, и
   * выписать такое правило руками — значит однажды ошибиться.
   */
  partsFor(block: string, properties: Record<string, string>): StateVariant[] {
    const state = this.read(block)
    if (!state?.multipart) {
      const single = this.variantFor(block, properties)
      return single ? [single] : []
    }

    const parts: StateVariant[] = []
    for (const part of state.multipart as any[]) {
      if (part.when && !matches(part.when, properties)) continue
      const variant = toVariant(part.apply)
      if (variant) parts.push(variant)
    }
    return parts
  }

  /**
   * Вариант для блока в заданном состоянии.
   *
   * Перечисленные свойства обязаны совпасть — ради них всё и затевалось;
   * остальные выбираются по «свежепоставленному» блоку. Возвращает null, если
   * блоксостояния нет: тогда работает запасной путь.
   */
  variantFor(block: string, wanted: Record<string, string> | string = {}): StateVariant | null {
    const state = this.read(block)
    if (!state) return null
    const want = typeof wanted === 'string' ? { facing: wanted } : wanted

    if (state.variants) {
      const entries = Object.entries(state.variants as Record<string, unknown>)
      const scored = entries
        .map(([key, value]) => ({ key, value, properties: parseKey(key) }))
        .filter(({ properties }) =>
          Object.entries(want).every(
            ([name, value]) => properties[name] === undefined || properties[name] === value,
          ),
        )
        .map((entry) => ({ ...entry, score: score(entry.properties, want) }))
        .sort((a, b) => b.score - a.score)

      const best = scored[0]
      if (!best) return null
      return toVariant(best.value)
    }

    if (state.multipart) {
      // У составных блоков (провод, забор) берём безусловные части: они
      // рисуются всегда, а условные зависят от соседей, которых мы не знаем.
      const always = (state.multipart as any[]).filter((part) => !part.when)
      const part = always[0] ?? (state.multipart as any[])[0]
      return part ? toVariant(part.apply) : null
    }

    return null
  }
}

/**
 * Проверка условия `when` из составного блоксостояния.
 * Значение вида `side|up` означает «любое из перечисленных».
 */
function matches(when: any, properties: Record<string, string>): boolean {
  if (Array.isArray(when.OR)) return when.OR.some((clause: any) => matches(clause, properties))
  if (Array.isArray(when.AND)) return when.AND.every((clause: any) => matches(clause, properties))

  return Object.entries(when).every(([name, expected]) => {
    if (name === 'OR' || name === 'AND') return true
    const actual = properties[name]
    if (actual === undefined) return false
    return String(expected).split('|').includes(actual)
  })
}

function parseKey(key: string): Record<string, string> {
  const properties: Record<string, string> = {}
  if (key === '') return properties
  for (const pair of key.split(',')) {
    const [name, value] = pair.split('=')
    if (name && value !== undefined) properties[name] = value
  }
  return properties
}

/**
 * Чем лучше вариант: запрошенные свойства весят много, остальные выбираются
 * по «свежепоставленному» блоку.
 */
function score(properties: Record<string, string>, wanted: Record<string, string>): number {
  let points = 0
  for (const [name, value] of Object.entries(properties)) {
    if (wanted[name] !== undefined) {
      points += wanted[name] === value ? 100 : -100
      continue
    }
    if (PREFERRED[name] === value) points += 1
    else points -= 1
  }
  return points
}

function toVariant(apply: unknown): StateVariant | null {
  // Игра допускает список случайных вариантов — берём первый, он основной.
  const entry: any = Array.isArray(apply) ? apply[0] : apply
  if (!entry?.model) return null
  return {
    model: String(entry.model).replace(/^minecraft:/, ''),
    x: Number(entry.x ?? 0),
    y: Number(entry.y ?? 0),
    uvlock: Boolean(entry.uvlock),
  }
}
