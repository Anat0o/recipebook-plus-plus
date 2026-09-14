/**
 * Какую модель рисовать для блока схемы.
 *
 * По умолчанию идентификатор блока и есть имя модели: `stone` → `block/stone`.
 * Исключения три:
 *
 *  1. У блока с состояниями отдельной модели «вообще» не существует —
 *     есть `repeater_1tick`, `oak_trapdoor_bottom`, `iron_door_bottom_left`.
 *  2. Жидкости игра рисует движком: у `water.json` и `lava.json` нет ни одного
 *     элемента, только текстура частиц. Куб приходится собирать самому.
 *  3. В схемах встречаются предметы-маркеры («здесь вода», «здесь семена»),
 *     у которых блочной модели нет по определению.
 */
import type { ResolvedModel } from '../mc/models.ts'

export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

/** Идентификатор в схеме → имя модели в assets/minecraft/models. */
export const BLOCK_MODELS: Record<string, string> = {
  // Состояния: модели без суффикса не существует.
  repeater: 'block/repeater_1tick',
  comparator: 'block/comparator',
  iron_door: 'block/iron_door_bottom_left',
  oak_door: 'block/oak_door_bottom_left',
  oak_trapdoor: 'block/oak_trapdoor_bottom',
  iron_trapdoor: 'block/iron_trapdoor_bottom',
  beehive: 'block/beehive_empty',
  bee_nest: 'block/bee_nest_empty',
  bamboo: 'block/bamboo1_age0',
  redstone: 'block/redstone_dust_dot',
  composter: 'block/composter',
  campfire: 'block/campfire',
  cactus: 'block/cactus',
  sugar_cane: 'block/sugar_cane',

  // Маркеры: в схеме стоит предмет, рисуем то, что он обозначает.
  melon_seeds: 'block/melon_stem_stage0',
  pumpkin_seeds: 'block/pumpkin_stem_stage0',
  wheat_seeds: 'block/wheat_stage0',
  melon_stem: 'block/melon_stem_stage7',
  pumpkin_stem: 'block/pumpkin_stem_stage7',
  wheat: 'block/wheat_stage7',
  oak_sign: 'block/oak_sign_rot_0',
  white_bed: 'block/white_bed_foot',
  shears: 'block/dispenser',
}

/**
 * Идентификатор блоксостояния, если он отличается от идентификатора предмета.
 * В схеме стоит предмет `redstone`, а блок в мире зовётся `redstone_wire`.
 */
export const BLOCK_STATES: Record<string, string> = {
  redstone: 'redstone_wire',
  melon_seeds: 'melon_stem',
  pumpkin_seeds: 'pumpkin_stem',
  wheat_seeds: 'wheat',
  oak_sign: 'oak_sign',
  white_bed: 'white_bed',
  shears: 'dispenser',
}

/**
 * Запасные имена моделей: между версиями они меняются, и без запасного
 * варианта блок молча выпал бы из схемы на старой версии.
 */
export const BLOCK_MODEL_FALLBACKS: Record<string, string[]> = {
  oak_sign: ['block/oak_sign', 'block/standing_sign'],
  white_bed: ['block/bed_foot', 'block/white_bed'],
}

/**
 * Полный куб из одной текстуры — для жидкостей, которых нет в моделях.
 * Первый кадр анимации берёт сборщик: текстура воды в атласе это лента.
 */
function fluidCube(texture: string, tinted: boolean): ResolvedModel {
  // Текстура воды в игре бесцветная — синеву даёт код по биому.
  const all = tinted ? { texture: '#all', tintindex: 0 } : { texture: '#all' }
  return {
    builtin: null,
    textures: { all: texture, particle: texture },
    guiLight: 'side',
    display: {},
    elements: [
      {
        from: [0, 0, 0],
        to: [16, 16, 16],
        faces: {
          down: { ...all, cullface: 'down' },
          up: { ...all, cullface: 'up' },
          north: { ...all, cullface: 'north' },
          south: { ...all, cullface: 'south' },
          west: { ...all, cullface: 'west' },
          east: { ...all, cullface: 'east' },
        },
      },
    ],
  }
}

/**
 * Сундук игра рисует как существо: модель из двух коробок с раскладкой UV
 * по текстуре 64×64. Повторяем её, иначе в схеме фермы вместо сундука
 * оказалась бы заглушка из досок.
 */
function chestModel(texture: string): ResolvedModel {
  // Пиксель текстуры 64×64 → единицы UV модели (0…16 на весь спрайт).
  const t = (px: number): number => (px / 64) * 16
  const face = (x1: number, y1: number, x2: number, y2: number) => ({
    texture: '#chest',
    uv: [t(x1), t(y1), t(x2), t(y2)] as [number, number, number, number],
  })

  /** Раскладка коробки (ширина, высота, глубина) от угла (u, v) — как у существ. */
  const box = (u: number, v: number, w: number, h: number, d: number) => ({
    up: face(u + d, v, u + d + w, v + d),
    down: face(u + d + w, v + d, u + d + 2 * w, v),
    north: face(u + d, v + d, u + d + w, v + d + h),
    east: face(u, v + d, u + d, v + d + h),
    south: face(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h),
    west: face(u + d + w, v + d, u + 2 * d + w, v + d + h),
  })

  return {
    builtin: null,
    textures: { chest: texture, particle: texture },
    guiLight: 'side',
    display: {},
    elements: [
      // Низ сундука.
      { from: [1, 0, 1], to: [15, 10, 15], faces: box(0, 19, 14, 10, 14) },
      // Крышка.
      { from: [1, 10, 1], to: [15, 14, 15], faces: box(0, 0, 14, 5, 14) },
      // Замок.
      { from: [7, 8, 0], to: [9, 12, 1], faces: box(0, 0, 2, 4, 1) },
    ],
  }
}

/** Морской источник: своей блочной модели нет, но текстура блока есть. */
function simpleCube(texture: string, from = 0, to = 16): ResolvedModel {
  const all = { texture: '#all' }
  return {
    builtin: null,
    textures: { all: texture, particle: texture },
    guiLight: 'side',
    display: {},
    elements: [
      {
        from: [from, from, from],
        to: [to, to, to],
        faces: { down: all, up: all, north: all, south: all, west: all, east: all },
      },
    ],
  }
}

/**
 * Запасные модели для блоков, у которых в старых версиях геометрии не было:
 * знак и кровать там рисовались кодом игры, а в 26.x у них появились модели.
 * Используются только если настоящая модель пустая — иначе она всегда лучше.
 */
export const SYNTHETIC_FALLBACKS: Record<string, ResolvedModel> = {
  oak_sign: plate('block/oak_planks', 7, 9, 0, 16, 9, 16),
  white_bed: plate('block/white_wool', 0, 16, 0, 16, 0, 9),
}

/** Плоская коробка из одной текстуры: хватает для маркеров схемы. */
function plate(
  texture: string,
  y1: number, y2: number,
  x1: number, x2: number,
  z1: number, z2: number,
): ResolvedModel {
  const all = { texture: '#all' }
  return {
    builtin: null,
    textures: { all: texture, particle: texture },
    guiLight: 'side',
    display: {},
    elements: [
      {
        from: [x1, y1, z1],
        to: [x2, y2, z2],
        faces: { down: all, up: all, north: all, south: all, west: all, east: all },
      },
    ],
  }
}

/** Модели, собранные вручную: игра рисует такие блоки своим кодом. */
export const SYNTHETIC_MODELS: Record<string, ResolvedModel> = {
  water_bucket: fluidCube('block/water_still', true),
  lava_bucket: fluidCube('block/lava_still', false),
  water: fluidCube('block/water_still', true),
  lava: fluidCube('block/lava_still', false),
  chest: chestModel('entity/chest/normal'),
  trapped_chest: chestModel('entity/chest/trapped'),
  conduit: simpleCube('block/conduit', 5, 11),
}

/** Блоки, которые рисуются полупрозрачными и не закрывают соседей. */
export const TRANSLUCENT = new Set(['water_bucket', 'lava_bucket', 'water', 'glass', 'glass_pane'])

/**
 * Цвет тонировки для граней с `tintindex`.
 * В игре он зависит от биома и зашит в код, поэтому берём типичный.
 */
export const BLOCK_TINTS: Record<string, number> = {
  water: 0x3f76e4,
  redstone: 0x9e0000,
  water_bucket: 0x3f76e4,
  sugar_cane: 0x91bd59,
  melon_seeds: 0x00ff00,
  pumpkin_seeds: 0x00ff00,
  melon_stem: 0x00ff00,
  pumpkin_stem: 0x00ff00,
  wheat: 0xd9b44a,
  oak_leaves: 0x77ab2f,
  birch_leaves: 0x80a755,
  grass_block: 0x91bd59,
}

/** Стороны, в которые может смотреть блок. */
export const FACINGS = ['north', 'south', 'west', 'east', 'up', 'down'] as const
export type Facing = (typeof FACINGS)[number]

export const OPPOSITE: Record<string, Facing> = {
  north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up',
}

/**
 * Блоки, у которых `facing` в игре указывает на вход, а не на выход.
 *
 * Вики о повторителе: «The direction from the output side to the input side».
 * То же видно и по данным: у всех прочих направленных блоков поворот
 * north→0°, east→90°, а у этих двух north→180°, east→270° — ровно полоборота
 * разницы. И базовая модель подтверждает: неподвижный факел повторителя (тот
 * элемент, что одинаков у `repeater_1tick` и `repeater_4tick`) стоит у
 * северной грани, значит выход неповёрнутой модели смотрит на север — а
 * блоксостояние зовёт это `facing=south`.
 *
 * В схемах соглашение одно на все блоки: `^east` значит «смотрит на восток»,
 * для повторителя и компаратора — «сигнал уходит на восток». Перевод в
 * соглашение игры делается один раз, при запросе блоксостояния.
 */
export const REVERSED_FACING = new Set(['repeater', 'comparator'])

/** Направление из схемы → направление блоксостояния игры. */
export function gameFacing(block: string, facing?: string): string | undefined {
  if (!facing || !REVERSED_FACING.has(block)) return facing
  return OPPOSITE[facing] ?? facing
}

/**
 * К чему тянется редстоуновая пыль.
 *
 * В игре она соединяется с другой пылью и с приборами, которые принимают
 * сигнал, а к глухому блоку остаётся точкой. Для схемы этого набора хватает.
 */
export const WIRE_CONNECTS = new Set([
  'redstone', 'repeater', 'comparator', 'redstone_torch', 'redstone_block',
  'redstone_lamp', 'lever', 'stone_button', 'stone_pressure_plate',
  'oak_pressure_plate', 'piston', 'sticky_piston', 'dispenser', 'dropper',
  'observer', 'hopper', 'note_block', 'daylight_detector', 'target',
  'copper_bulb', 'iron_door', 'oak_door', 'crafter', 'tnt',
])

/** Блоки, форма которых зависит от соседей. */
export const CONNECTING = new Set(['redstone'])

/**
 * Состояние «только что поставили», если общее правило врёт.
 *
 * Общее правило (`PREFERRED` в blockstates.ts) считает всё выключенным, и для
 * печи с костром это верно. А редстоуновый факел горит, пока его не погасят
 * сигналом, — без поправки во всех схемах стояли бы погашенные факелы.
 */
export const DEFAULT_STATE: Record<string, Record<string, string>> = {
  redstone_torch: { lit: 'true' },
  redstone_wall_torch: { lit: 'true' },
}

/** Настенная форма блока: в игре у неё отдельное имя блоксостояния. */
export const WALL_FORMS: Record<string, string> = {
  redstone_torch: 'redstone_wall_torch',
}

/**
 * Блоки, которым нужна опора: сами по себе они в игре не висят.
 *
 * `floor` — держатся на блоке снизу, `attach` — могут ещё и на боковом или
 * на потолке, и тогда крепление выводится по соседям.
 */
export const NEEDS_SUPPORT = new Set([
  'redstone', 'repeater', 'comparator', 'redstone_torch', 'lever', 'stone_button',
  'oak_button', 'stone_pressure_plate', 'oak_pressure_plate', 'oak_sign', 'torch',
  'rail', 'powered_rail', 'ladder', 'wheat_seeds', 'melon_seeds', 'pumpkin_seeds',
  'sugar_cane', 'cactus', 'bamboo', 'iron_door', 'oak_door',
])

/**
 * Блоки, которые сами опорой не служат.
 *
 * На пыль, факел или люк ничего не поставишь, а хрупкое вроде табличек и
 * рельсов не держит даже себя. Список нужен обеим проверкам: и «чем крепится
 * рычаг», и «не висит ли блок в воздухе».
 */
export const NON_SOLID = new Set([
  'redstone', 'redstone_torch', 'torch', 'lever', 'stone_button', 'oak_button',
  'stone_pressure_plate', 'oak_pressure_plate', 'oak_sign', 'ladder', 'rail',
  'powered_rail', 'repeater', 'comparator', 'water', 'water_bucket', 'lava',
  'lava_bucket', 'wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'sugar_cane',
  'bamboo', 'cactus', 'oak_slab', 'oak_trapdoor', 'iron_trapdoor', 'iron_door',
  'oak_door', 'hopper', 'chest', 'trapped_chest', 'composter', 'campfire',
  'white_bed', 'glass_pane', 'beehive', 'bee_nest', 'spawner',
])

/** Из них эти умеют держаться и за стену, и за потолок. */
export const ATTACHABLE = new Set([
  'lever', 'stone_button', 'oak_button', 'redstone_torch', 'torch', 'ladder',
])

/**
 * Токен состояния в ключе геометрии → свойства блоксостояния.
 *
 * У провода это стороны, в которые он тянется (`nse`). У остальных — набор
 * слов через `+`: чем блок крепится и включён ли он. Слово, а не «on»,
 * потому что «включённый» у лампы, поршня и двери зовётся по-разному, а у
 * факела включённое состояние ещё и стоит по умолчанию.
 */
const VARIANT_ATOMS: Record<string, [string, string]> = {
  floor: ['face', 'floor'],
  wall: ['face', 'wall'],
  ceiling: ['face', 'ceiling'],
  powered: ['powered', 'true'],
  lit: ['lit', 'true'],
  unlit: ['lit', 'false'],
  extended: ['extended', 'true'],
  open: ['open', 'true'],
  locked: ['enabled', 'false'],
  inverted: ['inverted', 'true'],
  subtract: ['mode', 'subtract'],
  sticky: ['type', 'sticky'],
}

export function variantProperties(block: string, variant?: string): Record<string, string> {
  if (!variant) return {}
  if (CONNECTING.has(block)) {
    const sides: Record<string, string> = {}
    for (const [letter, side] of [['n', 'north'], ['s', 'south'], ['e', 'east'], ['w', 'west']]) {
      sides[side!] = variant.includes(letter!) ? 'side' : 'none'
    }
    return sides
  }

  const properties: Record<string, string> = {}
  for (const atom of variant.split('+')) {
    const pair = VARIANT_ATOMS[atom]
    if (pair) {
      properties[pair[0]] = pair[1]
      continue
    }
    const delay = /^delay_([1-4])$/.exec(atom)
    if (delay) {
      properties.delay = delay[1]!
      continue
    }
    const explicit = /^([a-z_]+)=([a-z0-9_]+)$/.exec(atom)
    if (explicit) {
      properties[explicit[1]!] = explicit[2]!
      continue
    }
    throw new Error(`неизвестное состояние «${atom}» у блока ${block}`)
  }
  return properties
}

/**
 * Слово состояния для «включённой» формы блока: по нему печётся вторая
 * геометрия, которую показывает запущенный механизм.
 */
export const ACTIVE_VARIANT: Record<string, string> = {
  lever: 'powered',
  stone_button: 'powered',
  oak_button: 'powered',
  stone_pressure_plate: 'powered',
  oak_pressure_plate: 'powered',
  repeater: 'powered',
  comparator: 'powered',
  observer: 'powered',
  redstone_lamp: 'lit',
  copper_bulb: 'lit',
  redstone_torch: 'unlit',
  piston: 'extended',
  sticky_piston: 'extended',
  iron_door: 'open',
  oak_door: 'open',
  oak_trapdoor: 'open',
  iron_trapdoor: 'open',
  daylight_detector: 'inverted',
}

/** Блоки, для которых направление осмысленно: остальным поворот не пишем. */
export const DIRECTIONAL = new Set([
  'piston', 'sticky_piston', 'observer', 'hopper', 'dispenser', 'dropper',
  'furnace', 'blast_furnace', 'smoker', 'repeater', 'comparator', 'iron_door',
  'oak_door', 'oak_trapdoor', 'iron_trapdoor', 'ladder', 'lever', 'stone_button',
  'chest', 'carved_pumpkin', 'jack_o_lantern', 'beehive', 'bee_nest', 'oak_sign',
  'white_bed', 'daylight_detector', 'crafter',
])

/** Поршни: у них есть выдвинутая голова — отдельный блок без предмета. */
export const PISTONS = new Set(['piston', 'sticky_piston'])

/**
 * Блоки, которых нет в списке предметов, но геометрия нужна.
 * Голову поршня в инвентаре не подержишь, а показать её надо.
 */
/** Real world blocks that deliberately have no obtainable inventory item. */
export const BLOCKS_WITHOUT_ITEM = new Set([
  'piston_head', 'water', 'lava', 'melon_stem', 'pumpkin_stem', 'wheat',
])
