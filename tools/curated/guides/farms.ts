/**
 * Гайды по автофермам.
 *
 * Схемы намеренно минимальные: показан рабочий узел, а не готовая постройка на
 * тысячу блоков. Так его можно повторить с первого раза и потом размножить.
 * Слои идут снизу вверх.
 */
import { _, type Cell, type Guide, type Layer } from './types.ts'

/** Compact generators keep large farms complete without unreadable hand-written grids. */
const generatedLayer = (
  width: number,
  depth: number,
  fill: Cell,
  cells: [number, number, Cell][] = [],
): Layer => {
  const grid = Array.from({ length: depth }, () => Array.from({ length: width }, () => fill))
  for (const [x, z, cell] of cells) grid[z]![x] = cell
  return { grid }
}

const ringLayer = (size: number, block: Cell, inside: Cell = _, cells: [number, number, Cell][] = []): Layer => {
  const layer = {
    grid: Array.from({ length: size }, (_, z) =>
      Array.from({ length: size }, (_, x) => x === 0 || z === 0 || x === size - 1 || z === size - 1 ? block : inside)),
  }
  for (const [x, z, cell] of cells) layer.grid[z]![x] = cell
  return layer
}

const insetRingLayer = (size: number, inset: number, block: Cell, cells: [number, number, Cell][] = []): Layer => {
  const layer = generatedLayer(size, size, _)
  for (let i = inset; i < size - inset; i += 1) {
    layer.grid[inset]![i] = block
    layer.grid[size - inset - 1]![i] = block
    layer.grid[i]![inset] = block
    layer.grid[i]![size - inset - 1] = block
  }
  for (const [x, z, cell] of cells) layer.grid[z]![x] = cell
  return layer
}

export const FARM_GUIDES: Guide[] = [
  {
    id: 'sugar_cane',
    category: 'farm',
    ru: 'Ферма тростника',
    en: 'Sugar Cane Farm',
    icon: 'sugar_cane',
    editions: ['java'],
    ruSummary:
      'Наблюдатель видит, как тростник вырастает на третий блок, и поршень тут же его срезает.',
    enSummary:
      'An observer spots the cane growing to its third block and a piston shears it off at once.',
    materials: [
      { id: 'sugar_cane', count: 4 },
      { id: 'sand', count: 4 },
      { id: 'observer', count: 4 },
      { id: 'piston', count: 4 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'water_bucket', count: 1 },
      { id: 'redstone', count: 4 },
      { id: 'stone', count: 8 },
      { id: 'glass', count: 8 },
    ],
    schematics: [
      {
        ru: 'Разрез фермы',
        en: 'Cross-section',
        steps: [
          {
            ru: 'Соберите основание: песок у водяного канала, в конце канала — воронка в сундук.',
            en: 'Build the base: sand beside a water channel ending in a hopper and chest.',
          },
          {
            ru: 'Посадите тростник и закройте канал стеклом, чтобы предметы не вылетали.',
            en: 'Plant the cane and fence the channel with glass so drops cannot escape.',
          },
          {
            ru: 'На уровне второго сегмента поставьте поршень к тростнику и сплошной блок за поршнем.',
            en: 'At the second segment, face a piston into the cane and put a solid block behind it.',
          },
          {
            ru: 'Наблюдатель смотрит на третий сегмент; пыль за ним питает блок рядом с поршнем.',
            en: 'The observer watches the third segment; dust behind it powers the block beside the piston.',
          },
        ],
        layers: [
          { grid: [['stone', 'stone', 'sand', 'water', 'hopper^east', 'chest']] },
          { grid: [[_, _, 'sugar_cane', 'water', 'glass', _]] },
          { grid: [['stone', 'piston^east', 'sugar_cane', _, 'glass', _]] },
          { grid: [['redstone', 'observer^east', _, _, 'glass', _]] },
        ],
        animation: {
          duration: 20,
          loop: true,
          events: [
            { tick: 4, type: 'block', x: 2, y: 3, z: 0, block: 'sugar_cane' },
            { tick: 7, type: 'block', x: 2, y: 3, z: 0 },
            { tick: 8, type: 'show', entity: 'cane_drop', visible: true },
            { tick: 9, type: 'move', entity: 'cane_drop', x: 4, y: 1.1, z: 0 },
            { tick: 14, type: 'show', entity: 'cane_drop', visible: false },
            { tick: 14, type: 'container', x: 5, y: 0, z: 0, signal: 1 },
          ],
        },
        entities: [{ id: 'cane_drop', type: 'item', x: 2.5, y: 3, z: 0.5, scale: 0.25, visible: false }],
      },
    ],
    ruNotes: [
      'Наблюдатель должен смотреть на тростник, а поршень — толкать его вбок. Обычный поршень, не липкий.',
      'Срезанный тростник падает на воронку. Если он улетает мимо, поставьте по бокам стекло.',
    ],
    enNotes: [
      'The observer must face the cane and the piston must push sideways. A regular piston, not sticky.',
      'The cut cane drops onto the hopper. If it bounces away, fence the sides with glass.',
    ],
  },

  {
    id: 'bamboo',
    category: 'farm',
    ru: 'Ферма бамбука',
    en: 'Bamboo Farm',
    icon: 'bamboo',
    editions: ['java'],
    ruSummary: 'Тот же узел, что и у тростника, но бамбук растёт быстрее и годится в топливо.',
    enSummary: 'The same node as the cane farm, but bamboo grows faster and burns as fuel.',
    materials: [
      { id: 'bamboo', count: 4 },
      { id: 'observer', count: 4 },
      { id: 'piston', count: 4 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'dirt', count: 4 },
      { id: 'redstone', count: 4 },
      { id: 'stone', count: 8 },
      { id: 'glass', count: 8 },
      { id: 'water_bucket', count: 1 },
    ],
    schematics: [
      {
        ru: 'Разрез фермы',
        en: 'Cross-section',
        steps: [
          {
            ru: 'Сделайте водяной канал с воронкой и сундуком на выходе.',
            en: 'Build a water channel ending in a hopper and chest.',
          },
          {
            ru: 'Землю под бамбук поставьте рядом с каналом, не над воронкой.',
            en: 'Place the bamboo dirt beside the channel, not above the hopper.',
          },
          {
            ru: 'Посадите бамбук и оградите поток стеклом.',
            en: 'Plant the bamboo and enclose the stream with glass.',
          },
          {
            ru: 'Поставьте поршень к второму сегменту и сплошной блок позади него.',
            en: 'Face a piston into the second segment and put a solid block behind it.',
          },
          {
            ru: 'Наблюдатель смотрит на рост; пыль с его выхода спускает питание к поршню.',
            en: 'The observer watches growth; dust from its output carries power to the piston.',
          },
        ],
        layers: [
          { grid: [['stone', 'stone', 'dirt', 'water', 'hopper^east', 'chest']] },
          { grid: [[_, _, 'bamboo', 'water', 'glass', _]] },
          { grid: [['stone', 'piston^east', 'bamboo', _, 'glass', _]] },
          { grid: [['stone', _, 'bamboo', _, 'glass', _]] },
          { grid: [['redstone', 'observer^east', _, _, 'glass', _]] },
        ],
        animation: {
          duration: 20,
          loop: true,
          events: [
            { tick: 4, type: 'block', x: 2, y: 4, z: 0, block: 'bamboo' },
            { tick: 7, type: 'block', x: 2, y: 4, z: 0 },
            { tick: 8, type: 'show', entity: 'bamboo_drop', visible: true },
            { tick: 10, type: 'move', entity: 'bamboo_drop', x: 4, y: 1.1, z: 0 },
            { tick: 14, type: 'show', entity: 'bamboo_drop', visible: false },
            { tick: 14, type: 'container', x: 5, y: 0, z: 0, signal: 1 },
          ],
        },
        entities: [{ id: 'bamboo_drop', type: 'item', x: 2.5, y: 4, z: 0.5, scale: 0.25, visible: false }],
      },
    ],
    ruNotes: [
      'Бамбук растёт до 16 блоков, но резать выгоднее низко: меньше ждать.',
      'В плавильню бамбук идёт хуже угля — его удобнее сначала сжимать в блоки.',
    ],
    enNotes: [
      'Bamboo grows up to 16 blocks, but cutting low pays off: less waiting.',
      'Bamboo burns worse than coal — compress it into blocks first.',
    ],
  },

  {
    id: 'cactus',
    category: 'farm',
    ru: 'Ферма кактусов',
    en: 'Cactus Farm',
    icon: 'cactus',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Самая простая ферма без единого редстоуна: кактус ломается сам о соседний блок.',
    enSummary: 'The simplest farm with no redstone at all: the cactus breaks itself on a neighbour.',
    materials: [
      { id: 'cactus', count: 8 },
      { id: 'sand', count: 8 },
      { id: 'glass', count: 8 },
      { id: 'hopper', count: 8 },
      { id: 'chest', count: 1 },
      { id: 'water_bucket', count: 2 },
    ],
    schematics: [
      {
        ru: 'Модуль фермы',
        en: 'Farm module',
        steps: [
          {
            ru: 'Разнесите песок через клетку; рядом сделайте водяной канал в воронку и сундук.',
            en: 'Space sand every other tile; beside it run water into a hopper and chest.',
          },
          {
            ru: 'Посадите кактусы: на уровне основания вокруг них остаётся воздух.',
            en: 'Plant the cacti, keeping every horizontal side clear at base level.',
          },
          {
            ru: 'Стеклянный ломатель поставьте сбоку только на высоте нового сегмента.',
            en: 'Put the glass breaker beside only the height of the new segment.',
          },
        ],
        layers: [
          {
            grid: [
              ['sand', _, 'sand', _, _],
              ['water', 'water', 'water', 'hopper^east', 'chest'],
            ],
          },
          {
            grid: [
              ['cactus', _, 'cactus', _, _],
              [_, _, _, 'glass', _],
            ],
          },
          { grid: [[_, 'glass', _, _, _]] },
        ],
        entities: [{ id: 'cactus_drop', type: 'item', x: 0.5, y: 2.5, z: 0.5, scale: 0.25, visible: false }],
        animation: {
          duration: 24,
          loop: true,
          events: [
            { tick: 3, type: 'block', x: 0, y: 2, z: 0, block: 'cactus' },
            { tick: 5, type: 'block', x: 0, y: 2, z: 0 },
            { tick: 5, type: 'show', entity: 'cactus_drop', visible: true },
            { tick: 10, type: 'move', entity: 'cactus_drop', x: 3.4, y: 0.8, z: 1.5 },
            { tick: 16, type: 'show', entity: 'cactus_drop', visible: false },
            { tick: 16, type: 'container', x: 4, y: 0, z: 1, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Кактус не растёт, если рядом по бокам стоит любой блок на его уровне — оставьте место.',
      'Блок-ломатель ставится на уровень выше, по диагонали: тогда ломается только новый сегмент.',
    ],
    enNotes: [
      'Cactus will not grow with any block beside it at its own level — leave room.',
      'The breaker block goes one level up and diagonally, so only the new segment breaks.',
    ],
  },

  {
    id: 'melon_pumpkin',
    category: 'farm',
    ru: 'Ферма арбузов и тыкв',
    en: 'Melon and Pumpkin Farm',
    icon: 'melon',
    editions: ['java', 'bedrock'],
    ruSummary: 'Стебель выращивает плод на соседнюю клетку, наблюдатель это видит и ломает поршнем.',
    enSummary: 'The stem grows a fruit on the next tile, the observer sees it and a piston breaks it.',
    materials: [
      { id: 'melon_seeds', count: 4 },
      { id: 'farmland', count: 4 },
      { id: 'dirt', count: 4 },
      { id: 'observer', count: 4 },
      { id: 'piston', count: 4 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'water_bucket', count: 1 },
      { id: 'redstone', count: 8 },
      { id: 'stone', count: 12 },
      { id: 'glass', count: 6 },
    ],
    schematics: [
      {
        ru: 'Модуль на один стебель',
        en: 'Single-stem module',
        steps: [
          {
            ru: 'Земля под будущий плод, вспаханная грядка и вода рядом.',
            en: 'Dirt where the fruit will grow, tilled soil and water beside it.',
          },
          {
            ru: 'Посадите семена, а сбоку от места плода — поршень лицом к нему.',
            en: 'Plant the seeds, and put a piston facing the fruit tile from the side.',
          },
          {
            ru: 'Наблюдатель поставьте за стеблем лицом к нему: он заметит прикрепление плода.',
            en: 'Put the observer behind the stem facing it so it detects the fruit attachment.',
          },
          {
            ru: 'Замкните провод по опорным блокам и проведите водяной сбор к воронке.',
            en: 'Complete the wire on solid supports and run the water collection to a hopper.',
          },
        ],
        layers: [
          {
            grid: [
              ['stone', 'stone', 'dirt', 'farmland', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone', 'stone', 'stone'],
              ['water', 'water', 'water', 'water', 'hopper^east', 'chest'],
            ],
          },
          {
            grid: [
              ['redstone@4', 'piston^east@3', _, { block: 'melon_stem', step: 2, variant: 'age=7' }, 'observer^west@3', 'redstone@4'],
              ['redstone@4', 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4', 'redstone@4'],
              ['glass@4', _, _, _, 'glass@4', _],
            ],
          },
        ],
        entities: [{ id: 'melon_drop', type: 'item', x: 2.5, y: 1.5, z: 0.5, scale: 0.3, visible: false }],
        animation: {
          duration: 28,
          loop: true,
          events: [
            { tick: 4, type: 'block', x: 2, y: 1, z: 0, block: 'melon' },
            { tick: 4, type: 'block', x: 3, y: 1, z: 0, block: 'melon_stem', variant: 'age=7+attached=west' },
            { tick: 8, type: 'block', x: 2, y: 1, z: 0 },
            { tick: 8, type: 'block', x: 3, y: 1, z: 0, block: 'melon_stem', variant: 'age=7' },
            { tick: 8, type: 'show', entity: 'melon_drop', visible: true },
            { tick: 13, type: 'move', entity: 'melon_drop', x: 4.4, y: 0.8, z: 2.5 },
            { tick: 19, type: 'show', entity: 'melon_drop', visible: false },
            { tick: 19, type: 'container', x: 5, y: 0, z: 2, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Плод растёт только на земле, дёрне или грядке — под место плода нужен именно такой блок.',
      'Поршень не толкает плод, а разбивает его: арбуз при толчке рассыпается на дольки.',
      'Дольки падают там же, где был плод. Проведите вдоль ряда воду к воронке в сундук — она их и соберёт.',
      'Тыква работает точно так же — поменяйте семена.',
      'Стебель нельзя ломать: плод растёт с него снова и снова.',
    ],
    enNotes: [
      'The fruit only grows on dirt, grass or farmland — the fruit tile needs one of those.',
      'The piston does not shove the fruit, it breaks it: a pushed melon bursts into slices.',
      'The slices drop where the fruit stood. Run water along the row into a hopper and a chest to gather them.',
      'Pumpkins work exactly the same way — just swap the seeds.',
      'Never break the stem: it regrows the fruit again and again.',
    ],
  },

  {
    id: 'wheat',
    category: 'farm',
    ru: 'Ферма пшеницы на жителе',
    en: 'Villager Wheat Farm',
    icon: 'wheat',
    editions: ['java'],
    ruSummary:
      'Житель-фермер сам сажает и собирает, а лишнее выбрасывает — остаётся подставить воронку.',
    enSummary:
      'A farmer villager plants and harvests on his own and throws away the surplus — you just catch it.',
    materials: [
      { id: 'wheat_seeds', count: 16 },
      { id: 'farmland', count: 9 },
      { id: 'composter', count: 1 },
      { id: 'hopper', count: 3 },
      { id: 'chest', count: 1 },
      { id: 'water_bucket', count: 1 },
      { id: 'rail', count: 25 },
      { id: 'hopper_minecart', count: 1 },
      { id: 'oak_fence', count: 24 },
      { id: 'stone', count: 42 },
    ],
    schematics: [
      {
        ru: 'Рабочее место жителя',
        en: 'Villager workspace',
        steps: [
          {
            ru: 'Заложите сплошное основание под рельсы и точку разгрузки.',
            en: 'Lay a solid foundation for the rails and unloading point.',
          },
          {
            ru: 'Под всем полем уложите рельсовый маршрут вагонетки с воронкой и разгрузку в сундук.',
            en: 'Run a hopper-minecart track below the whole field and unload it into a chest.',
          },
          {
            ru: 'Сверху сделайте огороженное поле 5×5, воду в центре и компостер у ограды.',
            en: 'Above it make a fenced 5×5 plot, water in the centre and a composter at the fence.',
          },
          {
            ru: 'Засейте поле и поселите одного фермера с инвентарём, заполненным семенами.',
            en: 'Plant the field and add one farmer whose inventory is filled with seeds.',
          },
        ],
        layers: [
          {
            grid: Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 'stone')),
          },
          {
            grid: [
              ['rail', 'rail', 'rail', 'rail', 'rail', 'rail', 'rail'],
              ['rail', _, _, _, _, _, 'rail'],
              ['rail', 'rail', 'rail', 'rail', 'rail', 'rail', 'rail'],
              ['rail', _, _, _, _, _, 'rail'],
              ['rail', 'rail', 'rail', 'rail', 'rail', 'rail', 'rail'],
              [_, _, _, _, _, 'hopper^east', 'chest'],
            ],
          },
          {
            grid: [
              ['oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence'],
              ['oak_fence', 'farmland', 'farmland', 'farmland', 'farmland', 'farmland', 'oak_fence'],
              ['oak_fence', 'farmland', 'farmland', 'farmland', 'farmland', 'farmland', 'oak_fence'],
              ['oak_fence', 'farmland', 'farmland', 'water', 'farmland', 'farmland', 'oak_fence'],
              ['oak_fence', 'farmland', 'farmland', 'farmland', 'farmland', 'farmland', 'oak_fence'],
              ['oak_fence', 'farmland', 'farmland', 'farmland', 'farmland', _, 'composter'],
              ['oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence', 'oak_fence'],
            ],
          },
          {
            grid: [
              [_, _, _, _, _, _, _],
              [_, 'wheat', 'wheat', 'wheat', 'wheat', 'wheat', _],
              [_, 'wheat', 'wheat', 'wheat', 'wheat', 'wheat', _],
              [_, 'wheat', 'wheat', _, 'wheat', 'wheat', _],
              [_, 'wheat', 'wheat', 'wheat', 'wheat', 'wheat', _],
              [_, 'wheat', 'wheat', 'wheat', 'wheat', _, _],
            ],
          },
        ],
        entities: [
          { id: 'farmer', type: 'villager', variant: 'farmer', x: 5.5, y: 3, z: 5.5, facing: 'west' },
          { id: 'collector', type: 'hopper_minecart', x: 0.5, y: 1.2, z: 0.5, scale: 0.8 },
          { id: 'wheat_drop', type: 'item', x: 2.5, y: 3.4, z: 2.5, scale: 0.22, visible: false },
        ],
        animation: {
          duration: 50,
          loop: true,
          events: [
            { tick: 8, type: 'move', entity: 'farmer', x: 2.5, y: 3, z: 2.5 },
            { tick: 14, type: 'block', x: 2, y: 3, z: 2 },
            { tick: 14, type: 'show', entity: 'wheat_drop', visible: true },
            { tick: 20, type: 'move', entity: 'collector', x: 2.5, y: 1.2, z: 2.5 },
            { tick: 20, type: 'move', entity: 'wheat_drop', x: 2.5, y: 1.5, z: 2.5 },
            { tick: 24, type: 'show', entity: 'wheat_drop', visible: false },
            { tick: 24, type: 'container', x: 6, y: 1, z: 5, signal: 1 },
            { tick: 30, type: 'block', x: 2, y: 3, z: 2, block: 'wheat', variant: 'age_0' },
            { tick: 40, type: 'move', entity: 'collector', x: 5.5, y: 1.2, z: 5.5 },
          ],
        },
      },
    ],
    ruNotes: [
      'Для пшеницы надёжнее собирать выпавший урожай вагонеткой под грядками: фермер не обязан бросать пшеницу другому жителю.',
      'Заполните свободные слоты фермера семенами, иначе со временем он переключится на хлеб. Эта схема проверяется для Java.',
    ],
    enNotes: [
      'For wheat, a minecart under the farmland is reliable: the farmer does not have to throw wheat to another villager.',
      'Fill the farmer’s spare slots with seeds or it may eventually switch to bread. This layout is verified for Java.',
    ],
  },

  {
    id: 'bone_meal',
    category: 'farm',
    ru: 'Ферма костной муки',
    en: 'Bone Meal Farm',
    icon: 'bone_meal',
    editions: ['java', 'bedrock'],
    ruSummary: 'Бамбук растёт сам, поршень его срезает, воронка сыплет его в компостер.',
    enSummary: 'Bamboo grows itself, a piston cuts it and a hopper feeds it into a composter.',
    materials: [
      { id: 'bamboo', count: 4 },
      { id: 'observer', count: 4 },
      { id: 'piston', count: 4 },
      { id: 'hopper', count: 6 },
      { id: 'dirt', count: 4 },
      { id: 'composter', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'water_bucket', count: 1 },
      { id: 'redstone', count: 4 },
      { id: 'stone', count: 8 },
      { id: 'glass', count: 6 },
    ],
    schematics: [
      {
        ru: 'Компостерный узел',
        en: 'Composter node',
        steps: [
          {
            ru: 'Воронка в сундук: сюда пойдёт готовая костная мука.',
            en: 'A hopper into a chest: the finished bone meal goes here.',
          },
          {
            ru: 'Над воронкой — компостер.',
            en: 'The composter above the hopper.',
          },
          {
            ru: 'Над компостером — воронка вниз; водяной желоб приводит срезанный бамбук прямо на неё.',
            en: 'Above the composter is a downward hopper; a water trough brings cut bamboo directly onto it.',
          },
          {
            ru: 'Рядом с желобом поставьте землю, посадите бамбук и оградите поток стеклом.',
            en: 'Beside the trough place dirt, plant bamboo and enclose the stream with glass.',
          },
          {
            ru: 'На уровне второго блока — поршень лицом к бамбуку: он и срезает.',
            en: 'At second-block height, a piston facing the bamboo: that is the cutter.',
          },
          {
            ru: 'Наблюдатель следит за ростом; пыль на сплошном блоке передаёт импульс поршню.',
            en: 'An observer watches growth; dust on a solid block passes its pulse to the piston.',
          },
        ],
        layers: [
          { grid: [['hopper^east', 'chest', _, _, _]] },
          { grid: [['composter', _, _, _, _]] },
          { grid: [['hopper^down', 'water', 'dirt', 'stone', 'stone']] },
          { grid: [[_, 'water', 'bamboo', 'glass', _]] },
          { grid: [[_, _, 'bamboo', 'piston^west', 'stone']] },
          { grid: [[_, _, _, 'observer^west', 'redstone']] },
        ],
        entities: [{ id: 'compost_drop', type: 'item', x: 2.5, y: 5, z: 0.5, scale: 0.22, visible: false }],
        animation: {
          duration: 36,
          loop: true,
          events: [
            { tick: 4, type: 'block', x: 2, y: 5, z: 0, block: 'bamboo' },
            { tick: 8, type: 'block', x: 2, y: 5, z: 0 },
            { tick: 8, type: 'show', entity: 'compost_drop', visible: true },
            { tick: 13, type: 'move', entity: 'compost_drop', x: .5, y: 3, z: .5 },
            { tick: 18, type: 'show', entity: 'compost_drop', visible: false },
            { tick: 19, type: 'container', x: 0, y: 2, z: 0, signal: 8 },
            { tick: 27, type: 'container', x: 0, y: 2, z: 0, signal: 0 },
            { tick: 28, type: 'container', x: 1, y: 0, z: 0, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Срезанный бамбук падает на землю рядом с воронкой. Чтобы он попал внутрь, пустите вдоль ряда воду — она и подтащит его.',
      'Компостер набирается за 7 бамбуков в среднем и выдаёт одну костную муку.',
      'Воронка снизу обязательна: иначе мука останется в компостере и он забьётся.',
    ],
    enNotes: [
      'The cut bamboo lands on the dirt beside the hopper. Run water along the row to sweep it in.',
      'A composter fills from about 7 bamboo and yields one bone meal.',
      'The hopper underneath is required, otherwise the meal stays put and the composter jams.',
    ],
  },

  {
    id: 'chicken',
    category: 'farm',
    ru: 'Ферма кур',
    en: 'Chicken Farm',
    icon: 'chicken',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Куры несут яйца в воронку, раздатчик бросает их обратно, из части вылупляются цыплята.',
    enSummary:
      'Hens drop eggs into a hopper, a dispenser throws them back, and some hatch into chicks.',
    materials: [
      { id: 'dispenser', count: 1 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'lava_bucket', count: 1 },
      { id: 'oak_slab', count: 1 },
      { id: 'observer', count: 2 },
      { id: 'glass', count: 8 },
      { id: 'stone', count: 3 },
    ],
    schematics: [
      {
        ru: 'Разрез фермы',
        en: 'Cross-section',
        steps: [
          {
            ru: 'Воронка в сундук — за жареным мясом.',
            en: 'A hopper into a chest for the cooked meat.',
          },
          {
            ru: 'Над воронкой — нижняя плита: цыплята стоят на ней, а предметы проходят вниз.',
            en: 'Above the hopper is a bottom slab: chicks stand on it while drops pass below.',
          },
          {
            ru: 'Лаву удержите над головами цыплят: коснётся её только выросшая курица.',
            en: 'Hold lava above chick head height so only a grown chicken touches it.',
          },
          {
            ru: 'Раздатчик стреляет яйцами в нижнюю камеру; два встречных наблюдателя дают автоматический такт.',
            en: 'The dispenser fires eggs into the lower chamber; two facing observers provide the clock.',
          },
          {
            ru: 'Воронка под взрослыми курами подаёт яйца в раздатчик.',
            en: 'A hopper beneath the adult hens feeds their eggs into the dispenser.',
          },
          {
            ru: 'Закройте обе камеры стеклом и верхней крышкой.',
            en: 'Enclose both chambers with glass and a top cover.',
          },
        ],
        layers: [
          { grid: [['hopper^east', 'chest', 'stone', 'stone', 'stone']] },
          { grid: [['oak_slab', 'glass', _, _, _]] },
          { grid: [['lava', 'glass', _, _, _]] },
          { grid: [['glass', 'glass', 'dispenser^west', 'observer^east', 'observer^west']] },
          { grid: [['glass', 'glass', 'hopper^down', 'glass', 'glass']] },
          { grid: [['glass', 'glass', 'glass', 'glass', 'glass']] },
        ],
        entities: [
          { id: 'adult_hen_1', type: 'chicken', x: 2.3, y: 5, z: .5 },
          { id: 'adult_hen_2', type: 'chicken', x: 2.7, y: 5, z: .5 },
          { id: 'egg', type: 'item', x: 2.4, y: 4, z: .5, scale: .2, visible: false },
          { id: 'chick', type: 'chicken', x: .5, y: 2, z: .5, scale: .5, visible: false },
        ],
        animation: {
          duration: 44,
          loop: true,
          events: [
            { tick: 5, type: 'show', entity: 'egg', visible: true },
            { tick: 9, type: 'move', entity: 'egg', x: .5, y: 2, z: .5 },
            { tick: 11, type: 'show', entity: 'egg', visible: false },
            { tick: 11, type: 'show', entity: 'chick', visible: true },
            { tick: 28, type: 'move', entity: 'chick', x: .5, y: 2.5, z: .5 },
            { tick: 34, type: 'show', entity: 'chick', visible: false },
            { tick: 34, type: 'container', x: 1, y: 0, z: 0, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Два наблюдателя дают быстрый такт; поставьте между ним и раздатчиком рычаг, если нужна ручная остановка.',
      'Лава должна висеть над нижней плитой: цыплёнок ниже её, взрослая курица загорается и даёт жареное мясо.',
      'Из яйца цыплёнок появляется примерно в одном случае из восьми, так что ферма разгоняется не сразу.',
    ],
    enNotes: [
      'Two observers provide a fast clock; add a lever between it and the dispenser if you need a manual stop.',
      'The lava must float above the bottom slab: chicks stay below it while adults ignite and drop cooked meat.',
      'Only about one egg in eight hatches, so the farm takes a while to spin up.',
    ],
  },

  {
    id: 'honey',
    category: 'farm',
    ru: 'Ферма мёда и сот',
    en: 'Honey and Honeycomb Farm',
    icon: 'honeycomb',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Улей набирается до пятого уровня, компаратор это замечает и включает раздатчик с ножницами.',
    enSummary:
      'The hive fills to level five, a comparator notices and fires a dispenser with shears.',
    materials: [
      { id: 'beehive', count: 1 },
      { id: 'dispenser', count: 1 },
      { id: 'shears', count: 1 },
      { id: 'comparator', count: 1 },
      { id: 'redstone', count: 6 },
      { id: 'hopper', count: 2 },
      { id: 'chest', count: 1 },
      { id: 'campfire', count: 1 },
      { id: 'stone', count: 7 },
      { id: 'glass', count: 10 },
    ],
    schematics: [
      {
        ru: 'Узел улья',
        en: 'Hive node',
        steps: [
          {
            ru: 'Костёр встанет прямо под ульем, рядом воронка в сундук. Остальное — площадка под провод.',
            en: 'The campfire goes directly under the hive, with a hopper into a chest beside it. The rest is a platform for the wire.',
          },
          {
            ru: 'Улей, напротив него раздатчик с ножницами, сзади компаратор.',
            en: 'The hive, a dispenser with shears opposite it, a comparator behind.',
          },
          {
            ru: 'Провод от компаратора кругом обратно к раздатчику: полный улей сам включает ножницы.',
            en: 'Wire from the comparator all the way round back to the dispenser: a full hive fires the shears itself.',
          },
        ],
        layers: [
          {
            grid: [
              ['chest', _, _, _],
              ['hopper^north', 'campfire', 'stone', 'stone'],
              ['stone', 'stone', 'stone', 'stone'],
            ],
          },
          {
            grid: [
              ['glass@3', 'glass@3', 'glass@3', 'glass@3', 'glass@3'],
              ['dispenser^east', 'beehive^south', 'comparator^east', 'redstone@3', 'glass@3'],
              ['redstone@3', 'redstone@3', 'redstone@3', 'redstone@3', 'glass@3'],
            ],
          },
          { grid: [['glass@3', 'glass@3', 'glass@3', 'glass@3', 'glass@3']] },
        ],
        entities: [
          { id: 'bee_1', type: 'bee', x: 3.5, y: 2.2, z: .5, scale: .65 },
          { id: 'bee_2', type: 'bee', x: 2.5, y: 2.6, z: .5, scale: .65 },
          { id: 'honey_drop', type: 'item', x: 1.5, y: 1.4, z: 1.5, scale: .2, visible: false },
        ],
        animation: {
          duration: 42,
          loop: true,
          events: [
            { tick: 5, type: 'move', entity: 'bee_1', x: 1.5, y: 2, z: 1.5 },
            { tick: 9, type: 'show', entity: 'bee_1', visible: false },
            { tick: 14, type: 'container', x: 1, y: 1, z: 1, signal: 5 },
            { tick: 18, type: 'show', entity: 'honey_drop', visible: true },
            { tick: 23, type: 'move', entity: 'honey_drop', x: .5, y: .8, z: 1.5 },
            { tick: 27, type: 'show', entity: 'honey_drop', visible: false },
            { tick: 28, type: 'container', x: 1, y: 1, z: 1, signal: 0 },
            { tick: 28, type: 'container', x: 0, y: 0, z: 0, signal: 1 },
            { tick: 32, type: 'show', entity: 'bee_1', visible: true },
          ],
        },
      },
    ],
    ruNotes: [
      'Костёр должен быть прямо под ульем и не дальше пяти блоков, иначе пчёлы нападут.',
      'Чтобы получать мёд в бутылках, замените ножницы стеклянными бутылками.',
    ],
    enNotes: [
      'The campfire must sit directly under the hive, within five blocks, or the bees turn hostile.',
      'For honey bottles instead of combs, load the dispenser with glass bottles.',
    ],
  },

  {
    id: 'iron',
    category: 'farm',
    ru: 'Ферма железа',
    en: 'Iron Farm',
    icon: 'iron_ingot',
    editions: ['java'],
    ruSummary:
      'Три жителя пугаются зомби и зовут на помощь — игра создаёт железного голема, ферма его ловит.',
    enSummary:
      'Three villagers panic at a zombie and call for help — the game spawns an iron golem and the farm catches it.',
    materials: [
      { id: 'white_bed', count: 3 },
      { id: 'glass', count: 32 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'lava_bucket', count: 1 },
      { id: 'water_bucket', count: 1 },
      { id: 'oak_trapdoor', count: 4 },
      { id: 'cobblestone', count: 48 },
      { id: 'stone', count: 40 },
    ],
    schematics: [
      {
        ru: 'Разрез',
        en: 'Cross-section',
        steps: [
          { ru: 'Сделайте сплошное основание, четыре воронки сведите в сундук.', en: 'Build a solid base and route four hoppers into a chest.' },
          { ru: 'Оградите камеру убийства и удержите лаву над воронками.', en: 'Enclose the kill chamber and suspend lava above the hoppers.' },
          { ru: 'Поднимите закрытую шахту, по которой голем падает в лаву.', en: 'Raise the enclosed shaft through which the golem falls into lava.' },
          { ru: 'Соберите единственную площадку появления 7×7 с водой к центральной шахте.', en: 'Build the only 7×7 spawn platform, with water feeding its centre shaft.' },
          { ru: 'Поднимите борта: вода и голем не должны уйти наружу.', en: 'Raise the rim so neither water nor the golem can escape.' },
          { ru: 'Над площадкой устройте капсулу: три полные кровати, три жителя и зомби за люком.', en: 'Above the platform add a pod with three complete beds, three villagers and a zombie behind a trapdoor.' },
          { ru: 'Закройте капсулу и крышу, а все остальные поверхности сделайте неспавнящими.', en: 'Close the pod and roof, and spawn-proof every other surface.' },
        ],
        layers: [
          generatedLayer(7, 7, 'stone', [[2, 3, 'hopper^east'], [3, 3, 'hopper^east'], [2, 4, 'hopper^east'], [3, 4, 'hopper^east'], [4, 3, 'chest']]),
          ringLayer(7, { block: 'glass', shell: true }, _, [[3, 3, 'lava']]),
          ringLayer(7, { block: 'glass', shell: true }, _),
          generatedLayer(7, 7, 'cobblestone', [[3, 3, _], [0, 0, 'water'], [6, 0, 'water'], [0, 6, 'water'], [6, 6, 'water']]),
          ringLayer(7, { block: 'glass', shell: true }, _),
          generatedLayer(7, 7, _, [
            [1, 1, { block: 'white_bed', facing: 'south', variant: 'part=foot' }], [1, 2, { block: 'white_bed', facing: 'south', variant: 'part=head' }],
            [3, 1, { block: 'white_bed', facing: 'south', variant: 'part=foot' }], [3, 2, { block: 'white_bed', facing: 'south', variant: 'part=head' }],
            [5, 1, { block: 'white_bed', facing: 'south', variant: 'part=foot' }], [5, 2, { block: 'white_bed', facing: 'south', variant: 'part=head' }],
            [2, 4, 'glass'], [3, 4, 'oak_trapdoor'], [4, 4, 'glass'], [2, 5, 'glass'], [4, 5, 'glass'],
          ]),
          generatedLayer(7, 7, { block: 'glass', shell: true }),
        ],
        entities: [
          { id: 'villager_1', type: 'villager', x: 1.5, y: 6, z: 2.5, facing: 'south' },
          { id: 'villager_2', type: 'villager', x: 3.5, y: 6, z: 2.5, facing: 'south' },
          { id: 'villager_3', type: 'villager', x: 5.5, y: 6, z: 2.5, facing: 'south' },
          { id: 'zombie', type: 'zombie', x: 3.5, y: 6, z: 5.5, facing: 'north' },
          { id: 'golem', type: 'iron_golem', x: 1.5, y: 4, z: 1.5, visible: false },
          { id: 'iron_drop', type: 'item', x: 3.5, y: 1, z: 3.5, scale: .25, visible: false },
        ],
        animation: {
          duration: 64,
          loop: true,
          events: [
            { tick: 5, type: 'move', entity: 'zombie', x: 3.5, y: 6, z: 4.7 },
            { tick: 14, type: 'show', entity: 'golem', visible: true },
            { tick: 24, type: 'move', entity: 'golem', x: 3.5, y: 4, z: 3.5 },
            { tick: 34, type: 'move', entity: 'golem', x: 3.5, y: 1, z: 3.5 },
            { tick: 43, type: 'show', entity: 'golem', visible: false },
            { tick: 43, type: 'show', entity: 'iron_drop', visible: true },
            { tick: 50, type: 'move', entity: 'iron_drop', x: 4.4, y: .7, z: 3.5 },
            { tick: 55, type: 'show', entity: 'iron_drop', visible: false },
            { tick: 55, type: 'container', x: 4, y: 0, z: 3, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Голем появляется в пределах 16 блоков по горизонтали от жителей — площадку делают тесной, чтобы место было только одно.',
      'Зомби нужен целый и не сгоревший: накройте его крышей и наденьте шлем.',
      'Эта компактная схема относится к Java: на Bedrock нужны другие условия деревни и больше жителей.',
    ],
    enNotes: [
      'The golem spawns within 16 blocks horizontally of the villagers — keep the platform tight so only one spot qualifies.',
      'The zombie must survive daylight: roof it over or give it a helmet.',
      'This compact layout is Java-only: Bedrock needs different village conditions and more villagers.',
    ],
  },

  {
    id: 'mob_tower',
    category: 'farm',
    ru: 'Тёмная ферма мобов',
    en: 'Dark Mob Farm',
    icon: 'rotten_flesh',
    editions: ['java'],
    ruSummary:
      'Тёмная комната на высоте, вода сгоняет мобов в шахту, падение с 22 блоков добивает их.',
    enSummary:
      'A dark room up high, water pushes mobs into a shaft, and a 22-block drop finishes them.',
    materials: [
      { id: 'cobblestone', count: 256 },
      { id: 'water_bucket', count: 4 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 2 },
      { id: 'oak_slab', count: 32 },
      { id: 'oak_trapdoor', count: 16 },
    ],
    schematics: [
      {
        ru: 'Площадка появления',
        en: 'Spawning platform',
        steps: [
          {
            ru: 'Сделайте четыре сухие площадки и водяные каналы крестом к центральной шахте.',
            en: 'Build four dry spawning pads with cross-shaped water channels into the centre shaft.',
          },
          {
            ru: 'По краям каналов поставьте открытые люки и закройте стены без щелей.',
            en: 'Fit open trapdoors at channel edges and close every gap in the walls.',
          },
          {
            ru: 'Поставьте светонепроницаемую крышу, сверху закройте её полублоками.',
            en: 'Add a light-tight roof and spawn-proof its top with slabs.',
          },
        ],
        layers: [
          generatedLayer(9, 9, 'cobblestone', [
            [4, 4, _], [4, 0, 'water'], [4, 1, 'water'], [4, 2, 'water'], [4, 3, 'water'],
            [4, 5, 'water'], [4, 6, 'water'], [4, 7, 'water'], [4, 8, 'water'],
            [0, 4, 'water'], [1, 4, 'water'], [2, 4, 'water'], [3, 4, 'water'],
            [5, 4, 'water'], [6, 4, 'water'], [7, 4, 'water'], [8, 4, 'water'],
          ]),
          ringLayer(9, { block: 'cobblestone', shell: true }, _, [[3, 4, 'oak_trapdoor'], [5, 4, 'oak_trapdoor'], [4, 3, 'oak_trapdoor'], [4, 5, 'oak_trapdoor']]),
          generatedLayer(9, 9, { block: 'cobblestone', shell: true }),
        ],
        entities: [
          { id: 'mob_zombie', type: 'zombie', x: 2.5, y: 1, z: 2.5 },
          { id: 'mob_skeleton', type: 'skeleton', x: 6.5, y: 1, z: 2.5 },
          { id: 'mob_spider', type: 'spider', x: 2.5, y: 1, z: 6.5, scale: .75 },
        ],
        animation: {
          duration: 36,
          loop: true,
          events: [
            { tick: 8, type: 'move', entity: 'mob_zombie', x: 4.5, y: 1, z: 3.5 },
            { tick: 16, type: 'move', entity: 'mob_zombie', x: 4.5, y: -2, z: 4.5 },
            { tick: 24, type: 'move', entity: 'mob_skeleton', x: 4.5, y: -2, z: 4.5 },
          ],
        },
      },
      {
        ru: 'Шахта и камера добивания',
        en: 'Drop shaft and finishing chamber',
        steps: [
          { ru: 'Внизу поставьте воронки в двойной сундук и оставьте безопасную щель для удара.', en: 'At the bottom route hoppers into a double chest and leave a safe hit slit.' },
          { ru: 'Поднимите закрытую шахту высотой 22 блока без выступов.', en: 'Raise a closed 22-block shaft with no ledges.' },
          { ru: 'Соедините верх шахты с центральным отверстием площадки.', en: 'Connect the shaft top to the platform’s centre hole.' },
        ],
        layers: [
          generatedLayer(3, 3, 'cobblestone', [[0, 1, 'hopper^east'], [1, 1, 'hopper^east'], [2, 1, 'chest']]),
          ...Array.from({ length: 22 }, () => ringLayer(3, { block: 'cobblestone', step: 2, shell: true }, _)),
          ringLayer(3, { block: 'cobblestone', step: 3, shell: true }, _),
        ],
        entities: [
          { id: 'falling_zombie', type: 'zombie', x: 1.5, y: 22, z: 1.5 },
          { id: 'loot', type: 'item', x: 1.5, y: 1, z: 1.5, scale: .25, visible: false },
        ],
        animation: {
          duration: 30,
          loop: true,
          events: [
            { tick: 5, type: 'move', entity: 'falling_zombie', x: 1.5, y: 12, z: 1.5 },
            { tick: 13, type: 'move', entity: 'falling_zombie', x: 1.5, y: 1, z: 1.5 },
            { tick: 20, type: 'show', entity: 'falling_zombie', visible: false },
            { tick: 20, type: 'show', entity: 'loot', visible: true },
            { tick: 25, type: 'move', entity: 'loot', x: 2.4, y: .6, z: 1.5 },
            { tick: 26, type: 'show', entity: 'loot', visible: false },
            { tick: 26, type: 'container', x: 2, y: 0, z: 1, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      '22 блока падения оставляют мобу пол-сердца: можно добить рукой и получить опыт.',
      'Мобы появляются только дальше 24 блоков от игрока — стойте у сундуков, а не на площадке.',
      'На Bedrock мобы появляются и на полублоках, поэтому потолок обязателен.',
    ],
    enNotes: [
      'A 22-block fall leaves half a heart: finish by hand and keep the experience.',
      'Mobs only spawn beyond 24 blocks from you — wait at the chests, not on the platform.',
      'On Bedrock mobs spawn on slabs too, so the ceiling is not optional.',
    ],
  },

  {
    id: 'creeper',
    category: 'farm',
    ru: 'Ферма пороха',
    en: 'Gunpowder Farm',
    icon: 'gunpowder',
    editions: ['java'],
    ruSummary:
      'Та же тёмная комната, но с потолком в два блока: пролезают только крипера и пауки.',
    enSummary: 'The same dark room, but two blocks tall: only creepers and spiders fit.',
    materials: [
      { id: 'cobblestone', count: 256 },
      { id: 'water_bucket', count: 4 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 2 },
      { id: 'oak_trapdoor', count: 16 },
      { id: 'white_carpet', count: 12 },
    ],
    schematics: [
      {
        ru: 'Комната крипера',
        en: 'Creeper room',
        steps: [
          {
            ru: 'Сделайте сухие площадки и водяные каналы к двум шахтам.',
            en: 'Build dry spawning pads and water channels leading to two shafts.',
          },
          {
            ru: 'Разложите ковры сеткой против пауков и посадите кошек в центрах площадок.',
            en: 'Place carpets in an anti-spider grid and seat cats at pad centres.',
          },
          {
            ru: 'Под сплошной крышей закрепите люки: высоты хватает криперу, но не зомби и скелету.',
            en: 'Attach trapdoors beneath a solid roof: creepers fit, zombies and skeletons do not.',
          },
          {
            ru: 'Закройте светонепроницаемую крышу и защитите её верх от спавна.',
            en: 'Close the light-tight roof and spawn-proof its upper surface.',
          },
        ],
        layers: [
          generatedLayer(9, 9, 'cobblestone', [
            [4, 0, 'water'], [4, 1, 'water'], [4, 2, 'water'], [4, 3, 'water'], [4, 4, _], [4, 5, 'water'], [4, 6, 'water'], [4, 7, 'water'], [4, 8, 'water'],
            [2, 2, _], [6, 6, _],
          ]),
          ringLayer(9, { block: 'cobblestone', shell: true }, _, [
            [1, 1, 'white_carpet'], [3, 1, 'white_carpet'], [5, 1, 'white_carpet'], [7, 1, 'white_carpet'],
            [1, 3, 'white_carpet'], [3, 3, 'white_carpet'], [5, 3, 'white_carpet'], [7, 3, 'white_carpet'],
            [1, 6, 'white_carpet'], [3, 6, 'white_carpet'], [5, 6, 'white_carpet'], [7, 6, 'white_carpet'],
          ]),
          generatedLayer(9, 9, { block: 'oak_trapdoor', variant: 'half=top' }),
          generatedLayer(9, 9, { block: 'cobblestone', shell: true }),
        ],
        entities: [
          { id: 'cat_1', type: 'cat', x: 2.5, y: 1, z: 2.5 },
          { id: 'cat_2', type: 'cat', x: 6.5, y: 1, z: 6.5 },
          { id: 'creeper_1', type: 'creeper', x: 1.5, y: 1, z: 6.5 },
          { id: 'creeper_2', type: 'creeper', x: 7.5, y: 1, z: 2.5 },
        ],
        animation: {
          duration: 34,
          loop: true,
          events: [
            { tick: 6, type: 'move', entity: 'creeper_1', x: 4.5, y: 1, z: 5.5 },
            { tick: 13, type: 'move', entity: 'creeper_1', x: 4.5, y: -2, z: 4.5 },
            { tick: 18, type: 'move', entity: 'creeper_2', x: 6.5, y: 1, z: 4.5 },
            { tick: 25, type: 'move', entity: 'creeper_2', x: 4.5, y: -2, z: 4.5 },
          ],
        },
      },
      {
        ru: 'Шахты и сбор пороха',
        en: 'Drop shafts and gunpowder collection',
        steps: [
          { ru: 'Под каждой шахтой поставьте воронку, обе направьте в двойной сундук.', en: 'Put a hopper under each shaft and route both into a double chest.' },
          { ru: 'Опустите закрытые шахты на 24 блока для автоматического убийства.', en: 'Run enclosed shafts down 24 blocks for automatic kills.' },
          { ru: 'Соедините верх каждой шахты с водяным каналом комнаты.', en: 'Join each shaft top to the room’s water channel.' },
        ],
        layers: [
          generatedLayer(5, 3, 'cobblestone', [[1, 1, 'hopper^east'], [2, 1, 'hopper^east'], [3, 1, 'chest']]),
          ...Array.from({ length: 24 }, () => generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 2, shell: true }], [2, 1, { block: 'cobblestone', step: 2, shell: true }], [4, 1, { block: 'cobblestone', step: 2, shell: true }]])),
          generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 3 }], [1, 1, { block: 'water', step: 3 }], [2, 1, { block: 'cobblestone', step: 3 }], [3, 1, { block: 'water', step: 3 }], [4, 1, { block: 'cobblestone', step: 3 }]]),
        ],
        entities: [
          { id: 'falling_creeper', type: 'creeper', x: 1.5, y: 24, z: 1.5 },
          { id: 'gunpowder_drop', type: 'item', x: 1.5, y: 1, z: 1.5, scale: .25, visible: false },
        ],
        animation: { duration: 30, loop: true, events: [
          { tick: 5, type: 'move', entity: 'falling_creeper', x: 1.5, y: 14, z: 1.5 },
          { tick: 14, type: 'move', entity: 'falling_creeper', x: 1.5, y: 1, z: 1.5 },
          { tick: 22, type: 'show', entity: 'falling_creeper', visible: false },
          { tick: 22, type: 'show', entity: 'gunpowder_drop', visible: true },
          { tick: 24, type: 'move', entity: 'gunpowder_drop', x: 3.3, y: .6, z: 1.5 },
          { tick: 25, type: 'show', entity: 'gunpowder_drop', visible: false },
          { tick: 25, type: 'container', x: 3, y: 0, z: 1, signal: 1 },
        ] },
      },
    ],
    ruNotes: [
      'Люки под потолком уменьшают полезную высоту и исключают зомби и скелетов.',
      'Кошки нужны внутри: криперы убегают от них в каналы; закрепите кошек вагонеткой или лодкой.',
      'Ковры ставят с промежутками меньше площади 3×3, чтобы пауку негде было появиться.',
    ],
    enNotes: [
      'Trapdoors below the roof reduce the usable height and exclude zombies and skeletons.',
      'Cats belong inside: creepers flee them into the channels; secure each cat in a minecart or boat.',
      'Space carpets so no clear 3×3 area remains for a spider spawn.',
    ],
  },

  {
    id: 'spawner',
    category: 'farm',
    ru: 'Ферма на спаунере',
    en: 'Spawner Farm',
    icon: 'spawner',
    editions: ['java'],
    ruSummary: 'Найденный в подземелье спаунер — самый быстрый источник опыта на раннем этапе.',
    enSummary: 'A dungeon spawner is the fastest early source of experience.',
    materials: [
      { id: 'water_bucket', count: 2 },
      { id: 'hopper', count: 2 },
      { id: 'chest', count: 1 },
      { id: 'cobblestone', count: 64 },
      { id: 'torch', count: 8 },
      { id: 'soul_sand', count: 1 },
      { id: 'oak_sign', count: 2 },
    ],
    schematics: [
      {
        ru: 'Комната спаунера',
        en: 'Spawner room',
        steps: [
          { ru: 'От центра спаунера отмерьте по четыре блока: внутренняя площадь комнаты 9×9.', en: 'Measure four blocks from the spawner centre: the chamber interior is 9×9.' },
          { ru: 'Поднимите стены так, чтобы внутри было пять блоков высоты, без освещённых щелей.', en: 'Raise walls for a five-block-high interior with no lit gaps.' },
          { ru: 'Оставьте спаунер в центре; воду поставьте вдоль дальней стены к выходному каналу.', en: 'Keep the spawner centred and place water along the back wall toward the exit channel.' },
          { ru: 'Закройте потолок; временные факелы снимайте последними.', en: 'Close the ceiling and remove temporary torches last.' },
        ],
        layers: [
          generatedLayer(11, 11, 'cobblestone', [[5, 10, _]]),
          ringLayer(11, { block: 'cobblestone', step: 2, shell: true }, _, [[1, 1, { block: 'water', step: 3 }], [5, 10, _], [9, 1, { block: 'water', step: 3 }]]),
          ringLayer(11, { block: 'cobblestone', step: 2, shell: true }, _, [[5, 5, { block: 'spawner', step: 3 }], [5, 10, _]]),
          ringLayer(11, { block: 'cobblestone', step: 2, shell: true }, _, [[5, 10, _]]),
          generatedLayer(11, 11, { block: 'cobblestone', step: 4, shell: true }),
        ],
        entities: [
          { id: 'spawned_zombie', type: 'zombie', x: 3.5, y: 1, z: 4.5, visible: false },
          { id: 'spawned_skeleton', type: 'skeleton', x: 7.5, y: 1, z: 6.5, visible: false },
        ],
        animation: {
          duration: 36,
          loop: true,
          events: [
            { tick: 5, type: 'show', entity: 'spawned_zombie', visible: true },
            { tick: 10, type: 'show', entity: 'spawned_skeleton', visible: true },
            { tick: 18, type: 'move', entity: 'spawned_zombie', x: 5.5, y: 1, z: 10.5 },
            { tick: 23, type: 'move', entity: 'spawned_skeleton', x: 5.5, y: 1, z: 10.5 },
            { tick: 28, type: 'show', entity: 'spawned_zombie', visible: false },
            { tick: 28, type: 'show', entity: 'spawned_skeleton', visible: false },
          ],
        },
      },
      {
        ru: 'Подъёмник и точка опыта',
        en: 'Elevator and XP point',
        steps: [
          { ru: 'Канал из комнаты упирается в табличку у колонны воды.', en: 'The chamber channel ends at a sign beside the water column.' },
          { ru: 'Под колонной поставьте песок душ; каждый блок колонны должен быть источником воды.', en: 'Put soul sand below the column; every water block must be a source.' },
          { ru: 'Наверху заверните мобов в закрытую шахту падения на 22 блока.', en: 'At the top turn mobs into an enclosed 22-block drop shaft.' },
          { ru: 'Внизу оставьте щель для ручного удара и воронки в сундук.', en: 'At the bottom leave a manual hit slit and hoppers into a chest.' },
        ],
        layers: [
          generatedLayer(5, 3, 'cobblestone', [[0, 1, 'hopper^east'], [1, 1, 'hopper^east'], [2, 1, 'chest'], [4, 1, 'soul_sand']]),
          generatedLayer(5, 3, _, [[3, 1, { block: 'oak_sign', step: 1 }], [4, 1, { block: 'water', step: 2 }]]),
          ...Array.from({ length: 22 }, () => generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 3, shell: true }], [2, 1, { block: 'cobblestone', step: 3, shell: true }], [4, 1, { block: 'water', step: 2 }]])),
          generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 3 }], [1, 1, { block: 'water', step: 3 }], [2, 1, { block: 'cobblestone', step: 3 }], [3, 1, { block: 'water', step: 3 }], [4, 1, { block: 'water', step: 2 }]]),
          generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 3 }], [1, 1, { block: 'water', step: 3 }], [2, 1, { block: 'cobblestone', step: 3 }], [3, 1, { block: 'cobblestone', step: 3 }], [4, 1, { block: 'cobblestone', step: 3 }]]),
          generatedLayer(5, 3, _, [[0, 1, { block: 'cobblestone', step: 4 }], [1, 1, { block: 'cobblestone', step: 4 }], [2, 1, { block: 'cobblestone', step: 4 }]]),
        ],
        entities: [
          { id: 'lifted_mob', type: 'zombie', x: 4.5, y: 1, z: 1.5 },
          { id: 'spawner_drop', type: 'item', x: 1.5, y: 1, z: 1.5, scale: .25, visible: false },
        ],
        animation: { duration: 42, loop: true, events: [
          { tick: 6, type: 'move', entity: 'lifted_mob', x: 4.5, y: 22, z: 1.5 },
          { tick: 14, type: 'move', entity: 'lifted_mob', x: 1.5, y: 22, z: 1.5 },
          { tick: 25, type: 'move', entity: 'lifted_mob', x: 1.5, y: 1, z: 1.5 },
          { tick: 30, type: 'show', entity: 'lifted_mob', visible: false },
          { tick: 30, type: 'show', entity: 'spawner_drop', visible: true },
          { tick: 34, type: 'move', entity: 'spawner_drop', x: 2.3, y: .6, z: 1.5 },
          { tick: 35, type: 'show', entity: 'spawner_drop', visible: false },
          { tick: 35, type: 'container', x: 2, y: 0, z: 1, signal: 1 },
        ] },
      },
    ],
    ruNotes: [
      'Спаунер выключается, если игрок дальше 16 блоков — площадка ожидания должна быть рядом.',
      'Свет 12 и выше останавливает спаунер: факелы ставьте снаружи комнаты.',
      'Схема рассчитана на зомби или скелетов. Паучий спаунер требует другой широкой шахты и сюда не подходит.',
    ],
    enNotes: [
      'A spawner stops when you are more than 16 blocks away — wait nearby.',
      'Light level 12 and up disables it: keep torches outside the room.',
      'This layout is for zombie or skeleton spawners. Spider spawners need a different wide transport and are excluded.',
    ],
  },

  {
    id: 'blaze',
    category: 'farm',
    ru: 'Ферма ифритов',
    en: 'Blaze Farm',
    icon: 'blaze_rod',
    editions: ['java'],
    ruSummary: 'Стержни ифрита нужны для зельеварения, и спаунер в крепости даёт их потоком.',
    enSummary: 'Blaze rods drive all brewing, and a fortress spawner delivers them in a stream.',
    materials: [
      { id: 'nether_bricks', count: 192 },
      { id: 'hopper', count: 4 },
      { id: 'chest', count: 1 },
      { id: 'piston', count: 4 },
      { id: 'redstone', count: 8 },
      { id: 'repeater', count: 2 },
      { id: 'lever', count: 1 },
    ],
    schematics: [
      {
        ru: 'Камера',
        en: 'Chamber',
        steps: [
          { ru: 'Под камерой поставьте воронки в сундук и оставьте безопасную щель для удара.', en: 'Below the chamber route hoppers into a chest and leave a safe hit slit.' },
          { ru: 'Соберите негорючую камеру-дробилку с двумя поршнями по бокам.', en: 'Build a non-flammable crusher chamber with pistons on both sides.' },
          { ru: 'Ступенчатой воронкой из блоков сведите внутреннее пространство к дробилке.', en: 'Use a stepped block funnel to narrow the chamber into the crusher.' },
          { ru: 'Оставьте спаунер в центре закрытой камеры 9×9×7.', en: 'Keep the spawner centred inside a closed 9×9×7 chamber.' },
          { ru: 'Проведите рычаг через повторители к обоим поршням дробилки.', en: 'Wire a lever through repeaters to both crusher pistons.' },
        ],
        layers: [
          generatedLayer(9, 9, 'nether_bricks', [[3, 4, 'hopper^east'], [4, 4, 'hopper^east'], [5, 4, 'chest']]),
          generatedLayer(9, 9, _, [
            [2, 4, 'piston^east'], [3, 4, _], [4, 4, _], [5, 4, 'piston^west'],
            [3, 3, 'nether_bricks'], [4, 3, 'nether_bricks'], [3, 5, 'nether_bricks'], [4, 5, 'nether_bricks'],
            [0, 4, { block: 'lever', step: 5 }],
            [1, 4, { block: 'repeater', facing: 'east', variant: 'delay_4', step: 5 }],
            [6, 4, { block: 'repeater', facing: 'west', variant: 'delay_4', step: 5 }],
            [7, 4, { block: 'redstone', step: 5 }],
            [0, 3, { block: 'redstone', step: 5 }], [7, 3, { block: 'redstone', step: 5 }],
            [0, 2, { block: 'redstone', step: 5 }], [1, 2, { block: 'redstone', step: 5 }],
            [2, 2, { block: 'redstone', step: 5 }], [3, 2, { block: 'redstone', step: 5 }],
            [4, 2, { block: 'redstone', step: 5 }], [5, 2, { block: 'redstone', step: 5 }],
            [6, 2, { block: 'redstone', step: 5 }], [7, 2, { block: 'redstone', step: 5 }],
          ]),
          insetRingLayer(9, 2, { block: 'nether_bricks', step: 3 }),
          insetRingLayer(9, 1, { block: 'nether_bricks', step: 3 }),
          ringLayer(9, { block: 'nether_bricks', step: 4, shell: true }, _, [[4, 4, { block: 'spawner', step: 4 }]]),
          ringLayer(9, { block: 'nether_bricks', step: 4, shell: true }),
          ringLayer(9, { block: 'nether_bricks', step: 4, shell: true }),
          generatedLayer(9, 9, { block: 'nether_bricks', step: 4, shell: true }),
        ],
        entities: [
          { id: 'blaze_1', type: 'blaze', x: 2.5, y: 5, z: 2.5 },
          { id: 'blaze_2', type: 'blaze', x: 6.5, y: 5, z: 6.5 },
          { id: 'rod_drop', type: 'item', x: 3.5, y: 1, z: 4.5, scale: .25, visible: false },
        ],
        animation: { duration: 48, loop: true, events: [
          { tick: 7, type: 'move', entity: 'blaze_1', x: 4.5, y: 3, z: 4.5 },
          { tick: 14, type: 'move', entity: 'blaze_1', x: 3.8, y: 1, z: 4.5 },
          { tick: 20, type: 'press', x: 0, y: 1, z: 4 },
          { tick: 31, type: 'show', entity: 'blaze_1', visible: false },
          { tick: 31, type: 'show', entity: 'rod_drop', visible: true },
          { tick: 38, type: 'move', entity: 'rod_drop', x: 5.3, y: .7, z: 4.5 },
          { tick: 40, type: 'show', entity: 'rod_drop', visible: false },
          { tick: 40, type: 'container', x: 5, y: 0, z: 4, signal: 1 },
        ] },
      },
    ],
    ruNotes: [
      'Ифриты не горят и не тонут: бить их придётся вручную или ронять с высоты.',
      'Возьмите зелье огнестойкости — без него у спаунера долго не простоять.',
      'В Незере вода и песок душ не транспортируют ифритов; эта схема использует форму камеры и поршневую дробилку.',
    ],
    enNotes: [
      'Blazes neither burn nor drown: finish them by hand or by fall damage.',
      'Bring fire resistance — without it you will not last at the spawner.',
      'Water and soul sand cannot transport blazes in the Nether; this layout uses chamber geometry and a piston crusher.',
    ],
  },

  {
    id: 'auto_smelter',
    category: 'farm',
    ru: 'Автоплавильня',
    en: 'Auto Smelter',
    icon: 'furnace',
    editions: ['java', 'bedrock'],
    ruSummary:
      'Три воронки: сверху сырьё, сбоку топливо, снизу выход. Печь работает, пока есть что плавить.',
    enSummary:
      'Three hoppers: ore on top, fuel from the side, output below. The furnace runs while there is work.',
    materials: [
      { id: 'furnace', count: 1 },
      { id: 'hopper', count: 3 },
      { id: 'chest', count: 3 },
    ],
    schematics: [
      {
        ru: 'Три воронки',
        en: 'Three hoppers',
        steps: [
          {
            ru: 'Внизу воронка в сундук — это выход готового.',
            en: 'At the bottom, a hopper into a chest — that is the output.',
          },
          {
            ru: 'Печь, а сбоку воронка из сундука с топливом.',
            en: 'The furnace, with a hopper from the fuel chest coming in from the side.',
          },
          {
            ru: 'Сверху воронка вниз — она подаёт сырьё.',
            en: 'Above it, a hopper pointing down to feed the ore.',
          },
          {
            ru: 'Над ней сундук с сырьём.',
            en: 'The ore chest on top.',
          },
        ],
        layers: [
          { grid: [[_, _, 'hopper^east', 'chest']] },
          {
            grid: [['chest', 'hopper^east', 'furnace^north']],
          },
          { grid: [[_, _, 'hopper^down']] },
          { grid: [[_, _, 'chest']] },
        ],
        entities: [{ id: 'smelted_item', type: 'item', x: 2.5, y: 2, z: .5, scale: .22, visible: false }],
        animation: {
          duration: 34,
          loop: true,
          events: [
            { tick: 3, type: 'container', x: 2, y: 2, z: 0, signal: 8 },
            { tick: 5, type: 'container', x: 1, y: 1, z: 0, signal: 8 },
            { tick: 10, type: 'container', x: 2, y: 1, z: 0, signal: 6 },
            { tick: 20, type: 'show', entity: 'smelted_item', visible: true },
            { tick: 24, type: 'move', entity: 'smelted_item', x: 3.4, y: .6, z: .5 },
            { tick: 28, type: 'show', entity: 'smelted_item', visible: false },
            { tick: 29, type: 'container', x: 2, y: 1, z: 0, signal: 0 },
            { tick: 29, type: 'container', x: 3, y: 0, z: 0, signal: 1 },
          ],
        },
      },
    ],
    ruNotes: [
      'Воронка сверху идёт в слот сырья, сбоку — в слот топлива, снизу — вынимает результат. Направление задаётся тем, куда вы смотрите при установке.',
      'Плавильня и коптильня работают вдвое быстрее печи, но берут не всё.',
    ],
    enNotes: [
      'The top hopper feeds the input slot, the side one the fuel slot, the bottom one pulls results out. Direction depends on where you aim when placing.',
      'A blast furnace or smoker is twice as fast but accepts less.',
    ],
  },
]
