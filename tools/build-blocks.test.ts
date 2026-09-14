/**
 * Проверки геометрии 3D-схем.
 *
 * Схема с неверным блоком выглядит правдоподобно и молча учит неправильному,
 * поэтому проверяется не «собралось без ошибок», а что у каждого блока есть
 * грани, текстуры лежат в атласе, а направления и шаги осмысленны.
 */
import { describe, expect, it } from 'vitest'
import { buildBlocks } from './build-blocks.ts'
import { buildGuides, schematicBlocks, ALL_GUIDES } from './build-guides.ts'
import { buildMultiblocks, multiblockBlocks } from './build-multiblocks.ts'
import { buildItems } from './build-items.ts'
import { parseCell } from './curated/guides/types.ts'
import { meshKey, unsupported } from './mc/placements.ts'
import { AssetSource, type ModelElement } from './mc/models.ts'
import { buildQuads, placeQuads } from './mc/quads.ts'
import { BLOCKS_WITHOUT_ITEM, FACINGS, gameFacing, REVERSED_FACING } from './curated/block-models.ts'
import { DEFAULT_VERSION } from './config.ts'
import { BlockStates } from './mc/blockstates.ts'
import { sourceDir } from './fetch-mcmeta.ts'

const knownItems = new Set(buildItems(DEFAULT_VERSION).items.map((item) => item.id))
// Ключ несёт направление и форму (`redstone^east#nse`) — в реестре ищем без них.
const used = [...schematicBlocks(ALL_GUIDES), ...multiblockBlocks()].filter((key) =>
  knownItems.has(key.split(/[\^#]/)[0]!) || BLOCKS_WITHOUT_ITEM.has(key.split(/[\^#]/)[0]!),
)
const { data: geometry, problems } = await buildBlocks(DEFAULT_VERSION, used, 'public/data/' + DEFAULT_VERSION)

const guides = buildGuides(knownItems).data
const multiblocks = buildMultiblocks(knownItems).data
const meshes = new Map(geometry.blocks.map((block) => [block.id, block]))

describe('геометрия блоков', () => {
  it('собирается без замечаний', () => {
    expect(problems).toEqual([])
  })

  it('у каждого блока есть хотя бы одна грань', () => {
    for (const block of geometry.blocks) {
      expect(block.faces.length, block.id).toBeGreaterThan(0)
    }
  })

  it('каждая грань ссылается на текстуру внутри атласа', () => {
    const tiles = (geometry.atlasWidth / geometry.tile) * (geometry.atlasHeight / geometry.tile)
    for (const block of geometry.blocks) {
      for (const face of block.faces) {
        expect(face.tex, block.id).toBeGreaterThanOrEqual(0)
        expect(face.tex, block.id).toBeLessThan(tiles)
        // Четыре угла: двенадцать координат и восемь UV.
        expect(face.pos.length, block.id).toBe(12)
        expect(face.uv.length, block.id).toBe(8)
      }
    }
  })

  it('координаты граней лежат в пространстве блока', () => {
    for (const block of geometry.blocks) {
      for (const face of block.faces) {
        for (const value of face.pos) {
          // Модели вроде забора немного выходят за куб, но не безгранично.
          expect(value, block.id).toBeGreaterThanOrEqual(-16)
          expect(value, block.id).toBeLessThanOrEqual(32)
        }
      }
    }
  })

  it('каждый блок всех построек имеет геометрию', () => {
    const builds = [
      ...guides.flatMap((guide) => guide.builds.map((build) => ({ id: guide.id, build }))),
      ...multiblocks.map((entry) => ({ id: entry.id, build: { placements: entry.placements } })),
    ]
    for (const { id, build } of builds) {
      for (const placement of build.placements) {
        const key = meshKey(placement.block, placement.facing, placement.variant)
        expect(meshes.has(key), `${id}: ${key}`).toBe(true)
      }
    }
  })
})

describe('разбор ячейки схемы', () => {
  it('читает блок, направление и шаг', () => {
    expect(parseCell('stone')).toEqual({ block: 'stone' })
    expect(parseCell('piston^east')).toEqual({ block: 'piston', facing: 'east' })
    expect(parseCell('piston^east@3')).toEqual({ block: 'piston', facing: 'east', step: 3 })
    expect(parseCell('hopper@2')).toEqual({ block: 'hopper', step: 2 })
  })

  it('пустая клетка ничего не даёт', () => {
    expect(parseCell('')).toBeNull()
    expect(parseCell('air')).toBeNull()
  })

  it('мусор не проглатывается молча', () => {
    expect(() => parseCell('piston^')).toThrow()
    expect(() => parseCell('piston^east@')).toThrow()
  })
})

describe('постройки', () => {
  const all = [
    ...guides.flatMap((guide) => guide.builds.map((build) => ({ id: guide.id, ...build }))),
    ...multiblocks.map((entry) => ({ id: entry.id, placements: entry.placements, steps: entry.steps })),
  ]

  it('в каждой есть хотя бы один блок', () => {
    for (const build of all) expect(build.placements.length, build.id).toBeGreaterThan(0)
  })

  it('шаги идут подряд начиная с первого', () => {
    for (const build of all) {
      const steps = [...new Set(build.placements.map((p) => p.step))].sort((a, b) => a - b)
      expect(steps[0], build.id).toBe(1)
      steps.forEach((step, index) => expect(step, build.id).toBe(index + 1))
    }
  })

  it('направления взяты из списка сторон', () => {
    for (const build of all) {
      for (const placement of build.placements) {
        if (placement.facing) {
          expect(FACINGS as readonly string[], `${build.id}: ${placement.block}`).toContain(
            placement.facing,
          )
        }
      }
    }
  })

  it('два блока не стоят в одной клетке', () => {
    for (const build of all) {
      const seen = new Set<string>()
      for (const p of build.placements) {
        const key = `${p.x},${p.y},${p.z}`
        expect(seen.has(key), `${build.id}: ${key}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('у направленных блоков направление проставлено', () => {
    // Поршень и наблюдатель без направления — это молча неверная инструкция.
    const mustFace = new Set(['piston', 'sticky_piston', 'observer', 'hopper'])
    for (const build of all) {
      for (const placement of build.placements) {
        if (mustFace.has(placement.block)) {
          expect(placement.facing, `${build.id}: ${placement.block}`).toBeTruthy()
        }
      }
    }
  })
})

describe('повороты берутся из блоксостояний игры', () => {
  const states = new BlockStates(
    `${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`,
  )

  /**
   * Эти четыре случая ломали ручную таблицу поворотов, и каждый выглядел
   * правдоподобно: блок стоял, просто смотрел не туда. Пусть теперь падает тест.
   */
  it('воронка вбок берёт другую модель, а не повёрнутую', () => {
    expect(states.variantFor('hopper', 'east')?.model).toBe('block/hopper_side')
    expect(states.variantFor('hopper', 'down')?.model).toBe('block/hopper')
  })

  it('раздатчик вверх берёт вертикальную модель', () => {
    expect(states.variantFor('dispenser', 'up')?.model).toBe('block/dispenser_vertical')
  })

  it('у повторителя восток — это 270°, а не 90°', () => {
    expect(states.variantFor('repeater', 'east')?.y).toBe(270)
    expect(states.variantFor('comparator', 'east')?.y).toBe(270)
  })

  it('у поршня нулевой поворот — север, а не верх', () => {
    expect(states.variantFor('piston', 'north')).toMatchObject({ x: 0, y: 0 })
    expect(states.variantFor('piston', 'up')?.x).toBe(270)
    expect(states.variantFor('observer', 'up')?.x).toBe(270)
  })

  it('у двери нулевой поворот — восток', () => {
    expect(states.variantFor('iron_door', 'east')?.y).toBe(0)
    expect(states.variantFor('iron_door', 'north')?.y).toBe(270)
  })

  it('идентификатор предмета переводится в имя блока', () => {
    // В схеме стоит предмет `redstone`, а блок в мире зовётся `redstone_wire`.
    expect(states.variantFor('redstone')).toBeNull()
    expect(states.variantFor('redstone_wire')).not.toBeNull()
  })
})

describe('редстоуновый провод соединяется с соседями', () => {
  const states = new BlockStates(`${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`)
  const sides = (dirs: string): Record<string, string> => ({
    north: dirs.includes('n') ? 'side' : 'none',
    south: dirs.includes('s') ? 'side' : 'none',
    east: dirs.includes('e') ? 'side' : 'none',
    west: dirs.includes('w') ? 'side' : 'none',
  })
  const models = (dirs: string): string[] =>
    states.partsFor('redstone_wire', sides(dirs)).map((part) => part.model)

  it('одинокая пыль — это точка', () => {
    expect(models('')).toEqual(['block/redstone_dust_dot'])
  })

  it('на прямом участке точки нет, только отрезки', () => {
    // Правило неочевидное: выписанное руками, оно и было бы ошибкой.
    expect(models('ns')).not.toContain('block/redstone_dust_dot')
    expect(models('ew')).not.toContain('block/redstone_dust_dot')
    expect(models('ns')).toHaveLength(2)
  })

  it('на повороте точка возвращается', () => {
    expect(models('ne')).toContain('block/redstone_dust_dot')
    expect(models('sw')).toContain('block/redstone_dust_dot')
  })

  it('перекрёсток — точка и четыре отрезка', () => {
    expect(models('nsew')).toHaveLength(5)
  })

  it('в схемах провод действительно соединён', () => {
    const wires = guides
      .flatMap((guide) => guide.builds.flatMap((build) => build.placements))
      .filter((placement) => placement.block === 'redstone')

    expect(wires.length).toBeGreaterThan(10)
    // Одинокая пыль посреди схемы почти наверняка означает разрыв в проводе.
    const lonely = wires.filter((placement) => !placement.variant)
    expect(lonely.length, `не соединено: ${lonely.length} из ${wires.length}`).toBe(0)
  })

  it('геометрия есть для каждой встречающейся формы', () => {
    const shapes = new Set(
      guides
        .flatMap((guide) => guide.builds.flatMap((build) => build.placements))
        .filter((placement) => placement.block === 'redstone')
        .map((placement) => meshKey(placement.block, placement.facing, placement.variant)),
    )
    for (const shape of shapes) expect(meshes.has(shape), shape).toBe(true)
  })
})

describe('блок смотрит туда, куда сказано', () => {
  const src = new AssetSource(`${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`)
  const states = new BlockStates(`${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`)

  /** Сторона света по внешней нормали грани. */
  function directionOf(normal: number[]): string {
    const magnitudes = normal.map(Math.abs)
    const axis = magnitudes.indexOf(Math.max(...magnitudes))
    if (axis === 0) return normal[0]! > 0 ? 'east' : 'west'
    if (axis === 1) return normal[1]! > 0 ? 'up' : 'down'
    return normal[2]! > 0 ? 'south' : 'north'
  }

  /**
   * Куда смотрит опознаваемая грань блока после поворота.
   *
   * Проверять глазами тут бесполезно: повёрнутый не туда блок выглядит
   * совершенно правдоподобно. А нормаль грани — это число, и оно либо
   * совпадает с заданным направлением, либо нет.
   */
  function facingOf(
    block: string,
    facing: string,
    sprite: string,
    properties: Record<string, string> = {},
  ): string {
    const variant = states.variantFor(block, { ...properties, facing })
    expect(variant, `${block}^${facing}: нет варианта блоксостояния`).not.toBeNull()
    const model = src.resolveModel(variant!.model)
    expect(model, `${block}^${facing}: нет модели ${variant!.model}`).not.toBeNull()

    const quads = placeQuads(
      buildQuads(model!.elements, model!.textures),
      { x: 0, y: 0, z: 0 },
      { x: variant!.x, y: variant!.y },
    )
    const face = quads.find((quad) => quad.sprite === sprite)
    expect(face, `${block}^${facing}: не нашлась грань ${sprite}`).toBeDefined()

    // Обход углов задан снаружи, поэтому векторное произведение и есть нормаль.
    const [a, b, c] = [face!.pos[0]!, face!.pos[1]!, face!.pos[2]!]
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    return directionOf([
      u[1]! * w[2]! - u[2]! * w[1]!,
      u[2]! * w[0]! - u[0]! * w[2]!,
      u[0]! * w[1]! - u[1]! * w[0]!,
    ])
  }

  const HORIZONTAL = ['north', 'east', 'south', 'west']
  const ALL = [...HORIZONTAL, 'up', 'down']

  it.each(HORIZONTAL)('печь, повёрнутая на %s, туда и смотрит', (facing) => {
    expect(facingOf('furnace', facing, 'block/furnace_front')).toBe(facing)
  })

  it.each(ALL)('наблюдатель, повёрнутый на %s, туда и смотрит', (facing) => {
    expect(facingOf('observer', facing, 'block/observer_front')).toBe(facing)
  })

  it.each(ALL)('поршень, повёрнутый на %s, туда и толкает', (facing) => {
    expect(facingOf('piston', facing, 'block/piston_top')).toBe(facing)
  })

  it.each(ALL)('липкий поршень в покое на %s показывает липкую сторону спереди', (facing) => {
    expect(facingOf('sticky_piston', facing, 'block/piston_top_sticky')).toBe(facing)
  })

  it.each(ALL)('выдвинутая липкая голова на %s показывает липкую сторону спереди', (facing) => {
    expect(facingOf('piston_head', facing, 'block/piston_top_sticky', {
      type: 'sticky',
      short: 'false',
    })).toBe(facing)
  })

  it.each(HORIZONTAL)('носик воронки на %s смещён в ту же сторону', (facing) => {
    // У воронки нет опознаваемой текстуры грани, зато носик виден по геометрии:
    // он выступает из центра блока в сторону выхода.
    const variant = states.variantFor('hopper', facing)!
    const model = src.resolveModel(variant.model)!
    const quads = placeQuads(
      buildQuads(model.elements, model.textures),
      { x: 0, y: 0, z: 0 },
      { x: variant.x, y: variant.y },
    )
    const points = quads.flatMap((quad) => quad.pos)
    // Носик — самая низкая часть модели; берём её центр по горизонтали.
    const floor = Math.min(...points.map((p) => p[1]))
    const spout = points.filter((p) => p[1] <= floor + 2)
    const centre = [0, 2].map((axis) => {
      const values = spout.map((p) => p[axis]!)
      return (Math.min(...values) + Math.max(...values)) / 2 - 8
    })

    const offset: Record<string, [number, number]> = {
      north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
    }
    const [dx, dz] = offset[facing]!
    expect(Math.sign(Math.round(centre[0]!)), `${facing}: смещение по X`).toBe(dx)
    expect(Math.sign(Math.round(centre[1]!)), `${facing}: смещение по Z`).toBe(dz)
  })
})

describe('повторитель и компаратор смотрят выходом туда, куда сказано', () => {
  const src = new AssetSource(`${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`)
  const states = new BlockStates(`${sourceDir(DEFAULT_VERSION, 'assets-json')}/assets/minecraft`)

  const HORIZONTAL = ['north', 'east', 'south', 'west']
  const OFFSET: Record<string, [number, number]> = {
    north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
  }

  /** Центр набора элементов после поворота блоксостояния, отсчитанный от центра блока. */
  function centreOf(
    elements: ModelElement[],
    textures: Record<string, string>,
    block: string,
    facing: string,
  ): [number, number] {
    const variant = states.variantFor(block, gameFacing(block, facing))
    expect(variant, `${block}^${facing}: нет варианта блоксостояния`).not.toBeNull()
    const quads = placeQuads(
      buildQuads(elements, textures),
      { x: 0, y: 0, z: 0 },
      { x: variant!.x, y: variant!.y },
    )
    const points = quads.flatMap((quad) => quad.pos)
    return [0, 2].map((axis) => {
      const values = points.map((p) => p[axis]!)
      return (Math.min(...values) + Math.max(...values)) / 2 - 8
    }) as [number, number]
  }

  function expectTowards(centre: [number, number], facing: string, what: string): void {
    const [dx, dz] = OFFSET[facing]!
    expect(Math.sign(Math.round(centre[0])), `${what} на ${facing}: смещение по X`).toBe(dx)
    expect(Math.sign(Math.round(centre[1])), `${what} на ${facing}: смещение по Z`).toBe(dz)
  }

  it.each(HORIZONTAL)('у повторителя на %s неподвижный факел стоит на выходе', (facing) => {
    // Какой из двух факелов неподвижен, спрашиваем у самой игры: при смене
    // задержки один элемент модели остаётся на месте, другой отъезжает.
    // Неподвижный стоит у выхода — по нему и проверяем направление.
    const one = src.resolveModel('block/repeater_1tick')!
    const four = src.resolveModel('block/repeater_4tick')!
    const boxOf = (element: ModelElement): string => JSON.stringify([element.from, element.to])
    const inFour = new Set(four.elements.map(boxOf))
    const fixed = one.elements.filter((element) => element.from[1]! >= 2 && inFour.has(boxOf(element)))
    expect(fixed, 'неподвижный факел должен быть ровно один').toHaveLength(1)

    expectTowards(centreOf(fixed, one.textures, 'repeater', facing), facing, 'факел повторителя')
  })

  it.each(HORIZONTAL)('у компаратора на %s факел режима стоит на выходе', (facing) => {
    // У компаратора три факела: пара сзади и одиночный спереди, тот самый,
    // что поднимается в режиме вычитания. Спереди он ниже — этим и опознаётся.
    const model = src.resolveModel('block/comparator')!
    const torches = model.elements.filter((element) => element.from[1]! >= 2)
    const lowest = Math.min(...torches.map((element) => element.to[1]!))
    const front = torches.filter((element) => element.to[1] === lowest)
    expect(front, 'факел режима должен быть один').toHaveLength(1)

    expectTowards(centreOf(front, model.textures, 'comparator', facing), facing, 'факел компаратора')
  })

  it('переворачивается ровно у этих двух блоков', () => {
    expect(gameFacing('repeater', 'east')).toBe('west')
    expect(gameFacing('comparator', 'north')).toBe('south')
    expect(gameFacing('piston', 'east')).toBe('east')
    expect(gameFacing('hopper', 'down')).toBe('down')
    expect([...REVERSED_FACING].sort()).toEqual(['comparator', 'repeater'])
  })

  it.each([...REVERSED_FACING])('%s повёрнут ровно на полоборота от обычного блока', (block) => {
    // Признак, по которому ошибку и нашли: у всех направленных блоков
    // north→0°, east→90°, а у этих двух — ровно на 180° больше.
    for (const [facing, standard] of [['north', 0], ['east', 90], ['south', 180], ['west', 270]] as const) {
      expect(states.variantFor(block, facing)?.y, `${block}^${facing}`).toBe((standard + 180) % 360)
    }
  })
})

describe('блокам есть на чём держаться', () => {
  const all = [
    ...guides.flatMap((guide) =>
      guide.builds.map((build) => ({ id: `${guide.id} / ${build.names.ru}`, ...build })),
    ),
    ...multiblocks.map((entry) => ({ id: entry.id, placements: entry.placements })),
  ]

  /**
   * Пыль, повторитель, факел, рычаг и кнопка в игре не висят: без опоры они
   * выпадают предметом. Схема с левитирующим рычагом выглядит правдоподобно и
   * при этом неповторима — поэтому проверка, а не просмотр глазами.
   */
  it('во всех постройках', () => {
    const broken = all.flatMap((build) =>
      unsupported(build.placements).map((problem) => `${build.id}: ${problem}`),
    )
    expect(broken, broken.join('; ')).toEqual([])
  })

  it('рычагу и кнопке проставлено крепление', () => {
    for (const build of all) {
      for (const placement of build.placements) {
        if (placement.block !== 'lever' && !placement.block.endsWith('_button')) continue
        expect(
          placement.variant,
          `${build.id}: ${placement.block} в (${placement.x},${placement.y},${placement.z})`,
        ).toMatch(/^(floor|wall|ceiling)$/)
      }
    }
  })
})

describe('направленный блок смотрит не в пустоту', () => {
  const OFFSET: Record<string, [number, number, number]> = {
    north: [0, 0, -1],
    south: [0, 0, 1],
    east: [1, 0, 0],
    west: [-1, 0, 0],
    up: [0, 1, 0],
    down: [0, -1, 0],
  }

  /**
   * Блоки, у которых направление означает «работать с соседом»: наблюдатель
   * следит за блоком, воронка отдаёт в контейнер. Пустая клетка перед ними —
   * либо опечатка в направлении, либо схема, в которой механизм ни к чему не
   * подключён.
   *
   * Поршня и раздатчика тут нет намеренно: они как раз работают в пустоту.
   */
  const WORKS_ON_NEIGHBOUR = new Set(['hopper', 'observer'])

  const all = [
    ...guides.flatMap((guide) => guide.builds.map((build) => ({ id: guide.id, ...build }))),
    ...multiblocks.map((entry) => ({ id: entry.id, placements: entry.placements })),
  ]

  it('во всех постройках', () => {
    const broken: string[] = []
    for (const build of all) {
      const occupied = new Set(build.placements.map((p) => `${p.x},${p.y},${p.z}`))
      // A growth observer is intentionally aimed at air in the initial frame;
      // the deterministic scenario must prove that a block later appears there.
      const animation = 'animation' in build
        ? build.animation as { events?: { type: string; block?: string; x: number; y: number; z: number }[] } | undefined
        : undefined
      const scenarioBlocks = new Set(
        (animation?.events ?? [])
          .filter((event) => event.type === 'block' && event.block)
          .map((event) => `${event.x},${event.y},${event.z}`),
      )
      const limit = (axis: 'x' | 'y' | 'z'): [number, number] => [
        Math.min(...build.placements.map((p) => p[axis])),
        Math.max(...build.placements.map((p) => p[axis])),
      ]
      const [minX, maxX] = limit('x')
      const [minY, maxY] = limit('y')
      const [minZ, maxZ] = limit('z')

      for (const placement of build.placements) {
        if (!placement.facing || !WORKS_ON_NEIGHBOUR.has(placement.block)) continue
        const offset = OFFSET[placement.facing]!
        const [x, y, z] = [placement.x + offset[0], placement.y + offset[1], placement.z + offset[2]]
        // Воронка на краю модуля передаёт дальше, за пределы схемы, — это не ошибка.
        const outside = x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ
        if (outside || occupied.has(`${x},${y},${z}`) || scenarioBlocks.has(`${x},${y},${z}`)) continue
        broken.push(
          `${build.id}: ${placement.block}^${placement.facing} в (${placement.x},${placement.y},${placement.z})`,
        )
      }
    }
    expect(broken, broken.join('; ')).toEqual([])
  })
})
