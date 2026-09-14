/**
 * Постройки из нескольких блоков: их нет ни в рецептах, ни в таблицах добычи —
 * игра проверяет форму в своём коде. Отсюда справочник узнаёт, что тыква нужна
 * не только для пирога, а блок железа — не только для красоты.
 *
 * Схема описывается слоями снизу вверх: `layers[0]` — нижний уровень.
 * Пустая клетка — пустая строка, `air` тоже допустим и означает то же самое.
 */

export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

export interface MultiblockStep {
  ru: string
  en: string
}

export interface Multiblock {
  id: string
  ru: string
  en: string
  /** Что получается: моб или рабочий блок. Иконка берётся отсюда. */
  icon: string
  /** Слои снизу вверх; каждый слой — строки сетки. */
  layers: string[][][]
  /** Подписи уровней снизу вверх, если нужны. */
  steps: MultiblockStep[]
  /**
   * Предметы-маркеры версии. Блоки постройки могут существовать задолго до
   * самой механики: медный блок и тыква есть с давних пор, а медный голем —
   * нет. Постройка показывается, только если маркер есть в версии.
   */
  requires?: string[]
  ruNote: string
  enNote: string
}

/** Пусто. */
const _ = ''

export const MULTIBLOCKS: Multiblock[] = [
  {
    id: 'wither',
    ru: 'Призыв Визера',
    en: 'Summoning the Wither',
    icon: 'wither_skeleton_skull',
    layers: [
      [
        [_, 'soul_sand', _],
        ['soul_sand', 'soul_sand', 'soul_sand'],
      ],
      [
        ['wither_skeleton_skull', 'wither_skeleton_skull', 'wither_skeleton_skull'],
        [_, _, _],
      ],
    ],
    steps: [
      { ru: 'Выложите песок душ буквой Т.', en: 'Lay the soul sand in a T shape.' },
      {
        ru: 'Поставьте три черепа сверху — последний череп запускает призыв.',
        en: 'Place three skulls on top — the last skull starts the summon.',
      },
    ],
    ruNote:
      'Подойдёт и почва душ. Визер взрывается сразу после появления, поэтому стройте вдали от дома.',
    enNote:
      'Soul soil works too. The Wither explodes right after it appears, so build far from home.',
  },
  {
    id: 'iron_golem',
    ru: 'Железный голем',
    en: 'Iron Golem',
    icon: 'iron_block',
    layers: [
      [[_, 'iron_block', _]],
      [['iron_block', 'iron_block', 'iron_block']],
      [[_, 'carved_pumpkin', _]],
    ],
    steps: [
      { ru: 'Поставьте блок железа.', en: 'Place a block of iron.' },
      { ru: 'Добавьте перекладину из трёх блоков железа.', en: 'Add a bar of three iron blocks.' },
      {
        ru: 'Наверх — вырезанную тыкву. Она ставится последней.',
        en: 'Put a carved pumpkin on top. It goes last.',
      },
    ],
    ruNote: 'Вместо тыквы подойдёт светильник Джека. Обычная невырезанная тыква не работает.',
    enNote: 'A jack o’lantern works instead. A plain uncarved pumpkin does not.',
  },
  {
    id: 'snow_golem',
    ru: 'Снежный голем',
    en: 'Snow Golem',
    icon: 'snow_block',
    layers: [[['snow_block']], [['snow_block']], [['carved_pumpkin']]],
    steps: [
      { ru: 'Поставьте блок снега.', en: 'Place a snow block.' },
      { ru: 'На него — второй блок снега.', en: 'A second snow block on top of it.' },
      { ru: 'Сверху — вырезанную тыкву.', en: 'A carved pumpkin above that.' },
    ],
    ruNote:
      'В пустыне и Нижнем мире голем тает. В тёплых биомах его спасает ведро воды рядом или снежное окружение.',
    enNote:
      'The golem melts in deserts and the Nether. In warm biomes keep it wet or in a snowy spot.',
  },
  {
    id: 'copper_golem',
    ru: 'Медный голем',
    en: 'Copper Golem',
    icon: 'copper_block',
    requires: ['copper_golem_statue', 'copper_chest'],
    layers: [[['copper_block']], [['carved_pumpkin']]],
    steps: [
      { ru: 'Поставьте блок меди.', en: 'Place a block of copper.' },
      {
        ru: 'Сверху — вырезанную тыкву или светильник Джека.',
        en: 'Put a carved pumpkin or jack o’lantern on top.',
      },
    ],
    ruNote:
      'Блок меди при этом превращается в медный сундук, а голем появляется на месте тыквы. Степень окисления голема и сундука повторяет степень окисления блока.',
    enNote:
      'The copper block turns into a copper chest, and the golem appears where the pumpkin was. Both inherit the oxidation stage of the block.',
  },
  {
    id: 'nether_portal',
    ru: 'Портал в Нижний мир',
    en: 'Nether Portal',
    icon: 'obsidian',
    layers: [
      [[_, 'obsidian', 'obsidian', _]],
      [['obsidian', _, _, 'obsidian']],
      [['obsidian', _, _, 'obsidian']],
      [['obsidian', _, _, 'obsidian']],
      [[_, 'obsidian', 'obsidian', _]],
    ],
    steps: [
      {
        ru: 'Нижняя перекладина рамки — два блока обсидиана. Углы ставить не нужно.',
        en: 'The bottom bar of the frame: two obsidian blocks. Corners are not needed.',
      },
      { ru: 'Стойки по бокам: по блоку с каждой стороны.', en: 'The uprights: one block on each side.' },
      { ru: 'Ещё по блоку — рамка растёт вверх.', en: 'One more block on each side as the frame grows.' },
      { ru: 'И ещё по блоку с каждой стороны.', en: 'And one more block on each side.' },
      {
        ru: 'Верхняя перекладина замыкает рамку. Подожгите проём огнивом.',
        en: 'The top bar closes the frame. Light the inside with flint and steel.',
      },
    ],
    ruNote:
      'Углы можно не ставить: на рамку хватает 10 блоков обсидиана. Рамку можно отлить на месте лавой и водой.',
    enNote:
      'Corners can be skipped: 10 obsidian blocks are enough. The frame can also be cast in place with lava and water.',
  },
  {
    id: 'beacon',
    ru: 'Пирамида маяка',
    en: 'Beacon Pyramid',
    icon: 'beacon',
    layers: [
      [
        ['iron_block', 'iron_block', 'iron_block'],
        ['iron_block', 'iron_block', 'iron_block'],
        ['iron_block', 'iron_block', 'iron_block'],
      ],
      [[_, 'beacon', _]],
    ],
    steps: [
      {
        ru: 'Выложите квадрат 3×3 из блоков железа, золота, изумруда, алмаза или незерита.',
        en: 'Lay a 3×3 square of iron, gold, emerald, diamond or netherite blocks.',
      },
      { ru: 'Поставьте маяк по центру сверху.', en: 'Place the beacon centred on top.' },
    ],
    ruNote:
      'Это первый из четырёх уровней. Каждый следующий шире на два блока — полная пирамида берёт 164 блока и открывает второй эффект.',
    enNote:
      'This is the first of four tiers. Each tier is two blocks wider — a full pyramid takes 164 blocks and unlocks the second effect.',
  },
  {
    id: 'conduit',
    ru: 'Каркас морского источника',
    en: 'Conduit Frame',
    icon: 'conduit',
    layers: [
      [
        [_, 'prismarine', _],
        ['prismarine', _, 'prismarine'],
        [_, 'prismarine', _],
      ],
      [
        ['prismarine', _, 'prismarine'],
        [_, 'conduit', _],
        ['prismarine', _, 'prismarine'],
      ],
      [
        [_, 'prismarine', _],
        ['prismarine', _, 'prismarine'],
        [_, 'prismarine', _],
      ],
    ],
    steps: [
      { ru: 'Нижнее кольцо рамки из призмарина.', en: 'The bottom ring of the prismarine frame.' },
      {
        ru: 'Средний уровень: четыре блока по углам, источник в середине.',
        en: 'The middle level: four corner blocks with the conduit in the centre.',
      },
      {
        ru: 'Верхнее кольцо — такое же, как нижнее. Залейте постройку водой: без неё источник не включится.',
        en: 'The top ring, same as the bottom. Then flood it: the conduit will not activate dry.',
      },
    ],
    ruNote:
      'Подойдёт любой призмарин, тёмный призмарин и морской фонарь. Минимум 16 блоков рамки, максимум 42 — тогда радиус наибольший.',
    enNote:
      'Any prismarine, dark prismarine or sea lantern works. 16 frame blocks minimum, 42 for the largest range.',
  },
]
