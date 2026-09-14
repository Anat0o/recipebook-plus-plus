/**
 * Сетка слоёв → трёхмерный список установок.
 *
 * Столбец даёт X, строка — Z, слой — Y. Шаг по умолчанию равен номеру слоя:
 * постройка растёт снизу вверх, и это почти всегда совпадает с порядком
 * сборки в тексте. Где не совпадает — в ячейке стоит суффикс `@`.
 */
import { parseCell, type Layer, type Placement } from '../curated/guides/types.ts'
import {
  ACTIVE_VARIANT, ATTACHABLE, CONNECTING, NEEDS_SUPPORT, NON_SOLID, OPPOSITE, PISTONS,
  WIRE_CONNECTS,
} from '../curated/block-models.ts'

export function toPlacements(layers: Layer[]): Placement[] {
  const out: Placement[] = []

  layers.forEach((layer, y) => {
    layer.grid.forEach((row, z) => {
      row.forEach((cell, x) => {
        const parsed = parseCell(cell)
        if (!parsed) return
        out.push({
          x,
          y,
          z,
          block: parsed.block,
          ...(parsed.facing ? { facing: parsed.facing } : {}),
          ...(parsed.variant ? { variant: parsed.variant } : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
          ...(parsed.shell ? { shell: true } : {}),
          step: parsed.step ?? y + 1,
        })
      })
    })
  })

  attachSupports(out)
  connectWires(out)

  // Шаги должны идти подряд с первого: пропуск оставил бы в ленте пустую
  // вкладку, на которой ничего не появляется.
  const used = [...new Set(out.map((p) => p.step))].sort((a, b) => a - b)
  const renumber = new Map(used.map((step, index) => [step, index + 1]))
  for (const placement of out) placement.step = renumber.get(placement.step)!

  return out
}

/** Все блоки, упомянутые в слоях. */
export function blocksIn(layers: Layer[]): Set<string> {
  const ids = new Set<string>()
  for (const layer of layers) {
    for (const row of layer.grid) {
      for (const cell of row) {
        const parsed = parseCell(cell)
        if (parsed) ids.add(parsed.block)
      }
    }
  }
  return ids
}

/**
 * Ключ геометрии: блок вместе с направлением и формой.
 *
 * Повёрнутый блок — это не тот же блок под другим углом: у воронки вбок
 * своя модель, у раздатчика вверх своя. У пыли к тому же своя форма на каждый
 * набор соседей. Поэтому геометрия печётся на такую тройку, а браузер уже
 * ничего не крутит и не достраивает.
 */
export function meshKey(block: string, facing?: string, variant?: string): string {
  return `${block}${facing ? `^${facing}` : ''}${variant ? `#${variant}` : ''}`
}

/** Стороны и смещения по горизонтали: сюда тянется провод и за это цепляются блоки. */
const SIDES: [string, number, number][] = [
  ['n', 0, -1],
  ['s', 0, 1],
  ['e', 1, 0],
  ['w', -1, 0],
]

const SIDE_NAMES: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west' }

/** Растения, которые растут сами на себе: тростник на тростнике держится. */
const SELF_STACKING = new Set(['sugar_cane', 'bamboo', 'cactus'])

/**
 * Блоки постройки, которым не на чем держаться.
 *
 * В игре пыль, рычаг и факел без опоры просто выпадают предметом, и схема с
 * левитирующим рычагом учит тому, чего повторить нельзя. Пустой список — это
 * и есть проверка: постройку можно собрать.
 */
export function unsupported(placements: Placement[]): string[] {
  const solid = new Set(
    placements.filter((p) => !NON_SOLID.has(p.block)).map((p) => `${p.x},${p.y},${p.z}`),
  )
  const kind = new Map(placements.map((p) => [`${p.x},${p.y},${p.z}`, p.block]))
  const problems: string[] = []

  for (const p of placements) {
    if (!NEEDS_SUPPORT.has(p.block)) continue
    const under = `${p.x},${p.y - 1},${p.z}`
    if (solid.has(under)) continue
    // Upper door halves and stacked plant segments are supported by the same
    // block directly below even though that lower block is non-solid.
    if (kind.get(under) === p.block && (p.block.endsWith('_door') || SELF_STACKING.has(p.block))) continue
    if (SELF_STACKING.has(p.block) && kind.get(under) === p.block) continue
    if (ATTACHABLE.has(p.block)) {
      const sideways = SIDES.some(([, dx, dz]) => solid.has(`${p.x + dx},${p.y},${p.z + dz}`))
      if (sideways || solid.has(`${p.x},${p.y + 1},${p.z}`)) continue
    }
    problems.push(`${p.block} в (${p.x},${p.y},${p.z})`)
  }
  return problems
}

/** Блоки, которые держатся только за стену: у них крепление задаёт поворот. */
const WALL_ONLY = new Set(['ladder'])

/** Блоки, которые при выборе предпочитают стену полу. */
const PREFERS_WALL = new Set(['redstone_torch', 'torch'])

/**
 * Проставляет рычагам, кнопкам и факелам крепление по соседям.
 *
 * В игре они ни за что не держатся сами: рычаг стоит на блоке, висит на
 * стене или под потолком, и от этого зависит и модель, и поворот. По
 * умолчанию блоксостояние выбирает настенный вариант — именно поэтому в
 * схемах рычаги выглядели левитирующими. Схема пишет просто `lever`, а чем
 * он держится, видно из самой постройки.
 */
function attachSupports(placements: Placement[]): void {
  // Опорой считается только сплошной блок: на пыль и факел не встанешь.
  const solid = new Set(
    placements.filter((p) => !NON_SOLID.has(p.block)).map((p) => `${p.x},${p.y},${p.z}`),
  )
  const has = (x: number, y: number, z: number): boolean => solid.has(`${x},${y},${z}`)

  for (const placement of placements) {
    if (!ATTACHABLE.has(placement.block)) continue
    const { x, y, z } = placement

    const wall = SIDES.find(([, dx, dz]) => has(x + dx, y, z + dz))
    const onFloor = has(x, y - 1, z)
    const onCeiling = !onFloor && !wall && has(x, y + 1, z)

    // Факел цепляется за стену, если она есть, и только иначе встаёт на пол:
    // в инверторе он гаснет от того блока, за который держится, и стоящий на
    // полу факел просто горел бы всегда. Рычагу и кнопке наоборот привычнее
    // пол — на него их и ставят.
    if (wall && (!onFloor || PREFERS_WALL.has(placement.block))) {
      // Рычаг смотрит прочь от стены, за которую держится.
      placement.facing ??= OPPOSITE[SIDE_NAMES[wall[0]]!]!
      if (!WALL_ONLY.has(placement.block)) placement.variant = 'wall'
      continue
    }
    if (WALL_ONLY.has(placement.block)) continue

    placement.facing ??= 'north'
    if (onCeiling) placement.variant = 'ceiling'
    else if (placement.block === 'lever' || placement.block.endsWith('_button')) {
      placement.variant = 'floor'
    }
  }
}

/**
 * Проставляет редстоуновой пыли форму по соседям.
 *
 * Без этого провод рассыпается на отдельные точки: в игре пыль тянется
 * к соседней пыли и к приборам, и именно эти линии показывают, куда идёт
 * сигнал — то есть ровно то, ради чего схему и смотрят.
 */
function connectWires(placements: Placement[]): void {
  const at = new Map(placements.map((p) => [`${p.x},${p.y},${p.z}`, p]))

  for (const placement of placements) {
    if (!CONNECTING.has(placement.block)) continue

    // Объектная запись может явно добавить ветвь к обычному запитываемому
    // блоку (например, в перекрёстной RS-защёлке). Автовычисление дополняет,
    // а не стирает такую точную форму.
    let sides = placement.variant?.replace(/[^nsew]/g, '') ?? ''
    for (const [letter, dx, dz] of SIDES) {
      // Провод тянется и к соседу на том же уровне, и к пыли ступенькой вверх:
      // так он взбирается на блок, как в игре.
      const neighbour =
        at.get(`${placement.x + dx},${placement.y},${placement.z + dz}`) ??
        at.get(`${placement.x + dx},${placement.y + 1},${placement.z + dz}`)
      if (neighbour && WIRE_CONNECTS.has(neighbour.block) && !sides.includes(letter)) sides += letter
    }
    if (sides) placement.variant = sides
  }
}

/**
 * Ключи геометрии, которые понадобятся слоям.
 * Считаются по уже развёрнутым установкам: форма пыли известна только там.
 */
export function meshKeysIn(layers: Layer[]): Set<string> {
  const keys = new Set<string>()
  for (const placement of toPlacements(layers)) {
    keys.add(meshKey(placement.block, placement.facing, placement.variant))
    for (const key of activeKeys(placement)) keys.add(key)
  }
  return keys
}

/**
 * Ключи включённых форм блока: лампа зажжённая, факел погасший, поршень
 * выдвинутый вместе с головой.
 *
 * Печём их всегда, а не по итогам симуляции: иначе запуск механизма зависел
 * бы от того, добрался ли до этой формы сборочный прогон, и редкий кадр молча
 * остался бы без геометрии.
 */
export function activeKeys(placement: Placement): string[] {
  const keys: string[] = []
  const active = ACTIVE_VARIANT[placement.block]
  if (active) {
    const variant = placement.variant ? `${placement.variant}+${active}` : active
    keys.push(meshKey(placement.block, placement.facing, variant))
  }
  if (PISTONS.has(placement.block)) {
    const sticky = placement.block === 'sticky_piston' ? 'sticky' : undefined
    keys.push(meshKey('piston_head', placement.facing, sticky))
  }
  return keys
}
