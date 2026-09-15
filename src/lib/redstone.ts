/**
 * Симулятор редстоуна для схем гайдов.
 *
 * Считает не «красиво», а по правилам игры — иначе запущенный механизм учил бы
 * тому, чего в игре не бывает. Правила взяты с вики и сведены к тому набору,
 * который встречается в схемах:
 *
 *  - **Сильное питание** дают компоненты (рычаг, кнопка, плита, факел) и
 *    включённые повторитель с компаратором. Сильно запитанный блок питает
 *    соседнюю пыль и включает соседние механизмы.
 *  - **Слабое питание** даёт только пыль — блоку, на котором лежит, и тому,
 *    в который смотрит. Слабо запитанный блок соседнюю пыль не питает, но
 *    механизм включает.
 *  - **Пыль** берёт максимум из соседей минус один шаг и тянется на уровень
 *    вверх и вниз.
 *  - **Факел** горит, пока не запитан блок, к которому он прикреплён,
 *    и переключается с задержкой в такт.
 *
 * Воронки моделируются дискретными инвентарями и честной блокировкой. Физика
 * воды, вагонетки и биологический рост остаются внешней средой сценария.
 */

export interface SimBlock {
  x: number
  y: number
  z: number
  block: string
  facing?: string
  variant?: string
  active?: boolean
  step: number
  /** Готовый цвет пыли по силе сигнала: подставляется вместо тонировки модели. */
  tint?: number
  inventory?: { id: string; count: number; key?: string }[]
}

type Cell = string

const DIRS: Record<string, [number, number, number]> = {
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  up: [0, 1, 0],
  down: [0, -1, 0],
}

const OPPOSITE: Record<string, string> = {
  north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up',
}

/** Блоки, которые сами опорой не служат: сквозь них питание не идёт. */
const NON_SOLID = new Set([
  'redstone', 'redstone_torch', 'torch', 'lever', 'stone_button', 'oak_button',
  'stone_pressure_plate', 'oak_pressure_plate', 'repeater', 'comparator', 'ladder',
  'oak_sign', 'water', 'water_bucket', 'lava', 'lava_bucket', 'hopper', 'chest',
  'iron_door', 'oak_door', 'oak_trapdoor', 'iron_trapdoor', 'oak_slab', 'composter',
  'campfire', 'glass_pane', 'farmland', 'bamboo', 'sugar_cane', 'cactus',
])

/** Что включается сигналом: показываем это состояние отдельной моделью. */
const MECHANISMS = new Set([
  'piston', 'sticky_piston', 'redstone_lamp', 'copper_bulb', 'iron_door', 'oak_door',
  'oak_trapdoor', 'iron_trapdoor', 'dispenser', 'dropper', 'note_block',
  'crafter', 'tnt', 'observer',
])

const PISTONS = new Set(['piston', 'sticky_piston'])
/** Неподвижные в Java блоки, встречающиеся в опубликованных схемах. */
const PISTON_IMMOVABLE = new Set([
  'piston', 'sticky_piston', 'hopper', 'chest', 'furnace', 'blast_furnace', 'smoker',
  'dispenser', 'dropper', 'crafter', 'spawner',
])
const BUTTONS = new Set(['stone_button', 'oak_button'])
const PLATES = new Set(['stone_pressure_plate', 'oak_pressure_plate'])

/** Ручные входы: по ним и рисуется кнопка «Запустить». */
export const INPUTS = new Set([
  'lever', 'stone_button', 'oak_button', 'stone_pressure_plate', 'oak_pressure_plate',
  'daylight_detector',
])

/** Сколько тиков держится нажатая кнопка (10 редстоун-тиков = 1 секунда). */
const BUTTON_TICKS = 10
/** Импульс наблюдателя. */
const OBSERVER_TICKS = 1
/** Воронка переносит один предмет каждые 8 игровых, то есть 4 редстоуновых тика. */
const HOPPER_TICKS = 4
const STACK_SIZE = 64

const key = (x: number, y: number, z: number): Cell => `${x},${y},${z}`
const cellOf = (b: { x: number; y: number; z: number }): Cell => key(b.x, b.y, b.z)

function step(cell: Cell, direction: string, times = 1): Cell {
  const [x, y, z] = cell.split(',').map(Number) as [number, number, number]
  const d = DIRS[direction]!
  return key(x + d[0] * times, y + d[1] * times, z + d[2] * times)
}

export class Redstone {
  private readonly at = new Map<Cell, SimBlock>()
  private readonly order: SimBlock[] = []
  private readonly initial: SimBlock[]

  /** Выходы блоков с задержкой — они и делают схему схемой, а не картинкой. */
  private torch = new Map<Cell, boolean>()
  private torchTimer = new Map<Cell, number>()
  private repeater = new Map<Cell, boolean>()
  private repeaterTimer = new Map<Cell, number>()
  private comparator = new Map<Cell, number>()
  private observer = new Map<Cell, number>()
  private watched = new Map<Cell, string>()
  private bulb = new Map<Cell, boolean>()
  private lever = new Map<Cell, boolean>()
  private button = new Map<Cell, number>()
  private detector = new Map<Cell, boolean>()

  /** Сила сигнала в каждой клетке пыли на текущем тике. */
  private dust = new Map<Cell, number>()
  private piston = new Map<Cell, boolean>()
  /** Смещение реально вытолкнутых блоков относительно исходной схемы. */
  private pistonShift = new Map<Cell, [number, number, number]>()
  private container = new Map<Cell, number>()
  private inventory = new Map<Cell, { id: string; count: number; key?: string }[]>()
  private hopperClock = 0
  private stabilizing = false
  private outputEvents: { cell: Cell; block: string; active: boolean }[] = []
  private lastActive = new Map<Cell, boolean>()

  constructor(placements: SimBlock[]) {
    this.initial = placements.map((placement) => ({ ...placement }))
    this.reset()
  }

  /** Возвращает схему в исходное состояние без пересоздания интерфейса. */
  reset(): void {
    this.at.clear(); this.order.length = 0
    this.torch.clear(); this.torchTimer.clear(); this.repeater.clear(); this.repeaterTimer.clear()
    this.comparator.clear(); this.observer.clear(); this.watched.clear(); this.bulb.clear()
    this.lever.clear(); this.button.clear(); this.detector.clear(); this.dust.clear(); this.piston.clear()
    this.pistonShift.clear()
    this.container.clear(); this.inventory.clear(); this.hopperClock = 0
    this.bulbEdge.clear(); this.lastActive.clear(); this.outputEvents = []
    for (const source of this.initial) {
      const placement = { ...source }
      this.order.push(placement)
      this.at.set(cellOf(placement), placement)
      if (placement.inventory?.length) {
        this.inventory.set(cellOf(placement), placement.inventory.map((stack) => ({ ...stack })))
      }
    }
    for (const placement of this.order) {
      const cell = cellOf(placement)
      if (placement.block === 'redstone_torch' || placement.block === 'torch') {
        this.torch.set(cell, placement.active ?? true)
      }
      if (placement.block === 'observer') this.watched.set(cell, this.stateOf(this.eye(placement)))
    }
    // Два поставленных лицом друг к другу наблюдателя в игре получают update
    // при установке второго блока. Финальная схема уже собрана, поэтому
    // воспроизводим именно это единственное установочное событие на reset.
    for (const placement of this.order) {
      if (placement.block !== 'observer') continue
      const watched = this.at.get(this.eye(placement))
      if (watched?.block === 'observer' && this.eye(watched) === cellOf(placement)) {
        this.observer.set(cellOf(placement), OBSERVER_TICKS + 1)
        break
      }
    }
    this.stabilizing = true
    this.stabilize()
    this.stabilizing = false
  }

  /** Внешнее изменение мира: рост растения или появление/исчезновение плода. */
  setBlock(x: number, y: number, z: number, block?: string, facing?: string, variant?: string): void {
    const cell = key(x, y, z)
    const old = this.at.get(cell)
    if (old) {
      this.order.splice(this.order.indexOf(old), 1)
      this.pistonShift.delete(cellOf(old))
    }
    this.at.delete(cell)
    this.inventory.delete(cell)
    this.container.delete(cell)
    if (!block) return
    const next: SimBlock = {
      x, y, z, block, step: old?.step ?? 1,
      ...(facing ? { facing } : {}), ...(variant ? { variant } : {}),
    }
    this.order.push(next)
    this.at.set(cell, next)
  }

  /** Сигнал компаратора от содержимого контейнера, 0…15. */
  setContainerSignal(x: number, y: number, z: number, signal: number): void {
    this.container.set(key(x, y, z), Math.max(0, Math.min(15, Math.round(signal))))
  }

  /** Внешний предмет попадает в показанный контейнер; дальше его двигает симулятор. */
  insertItem(x: number, y: number, z: number, item: string, count = 1): number {
    return this.addToInventory(key(x, y, z), item, count)
  }

  inventoryCountAt(x: number, y: number, z: number, item?: string): number {
    return (this.inventory.get(key(x, y, z)) ?? [])
      .filter((stack) => !item || stack.id === item)
      .reduce((sum, stack) => sum + stack.count, 0)
  }

  inventoryState(): { x: number; y: number; z: number; block: string; stacks: { id: string; count: number }[] }[] {
    const state: { x: number; y: number; z: number; block: string; stacks: { id: string; count: number }[] }[] = []
    for (const [cell, stacks] of this.inventory) {
      if (stacks.length === 0) continue
      const placement = this.at.get(cell)
      if (!placement) continue
      state.push({
        x: placement.x,
        y: placement.y,
        z: placement.z,
        block: placement.block,
        stacks: stacks.map(({ id, count }) => ({ id, count })),
      })
    }
    return state.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x)
  }

  drainEvents(): { cell: Cell; block: string; active: boolean }[] {
    const events = this.outputEvents
    this.outputEvents = []
    return events
  }

  snapshot(): string {
    return JSON.stringify([
      this.frame().map(({ x, y, z, block, facing, variant, tint }) => [x,y,z,block,facing,variant,tint]),
      [...this.inventory].sort(([a], [b]) => a.localeCompare(b)),
    ])
  }

  /** Клетки, по которым можно щёлкнуть: рычаг, кнопка, плита, датчик дня. */
  interactive(): SimBlock[] {
    return this.order.filter((placement) => INPUTS.has(placement.block))
  }

  /** Щелчок по входу: рычаг переключается, кнопка даёт импульс. */
  press(cell: Cell): void {
    const placement = this.at.get(cell)
    if (!placement) return
    if (placement.block === 'lever') this.lever.set(cell, !this.lever.get(cell))
    else if (BUTTONS.has(placement.block) || PLATES.has(placement.block)) {
      this.button.set(cell, BUTTON_TICKS)
    } else if (placement.block === 'daylight_detector') {
      this.detector.set(cell, !this.detector.get(cell))
    }
  }

  /** Есть ли вообще что запускать: без входа и без самозапуска кнопка не нужна. */
  static runnable(placements: SimBlock[]): boolean {
    return placements.some(
      (placement) => INPUTS.has(placement.block) || placement.block === 'observer',
    )
  }

  // ——— один такт ———

  tick(): void {
    for (const [cell, left] of this.button) {
      if (left > 0) this.button.set(cell, left - 1)
    }
    for (const [cell, left] of this.observer) {
      if (left > 0) this.observer.set(cell, left - 1)
    }

    this.spreadDust()

    const nextTorch = new Map<Cell, boolean>()
    const nextRepeater = new Map<Cell, boolean>()
    const nextComparator = new Map<Cell, number>()

    for (const placement of this.order) {
      const cell = cellOf(placement)
      switch (placement.block) {
        case 'redstone_torch':
        case 'torch':
          nextTorch.set(cell, !this.powered(this.support(placement)))
          break
        case 'repeater':
          nextRepeater.set(cell, this.repeaterLocked(placement)
            ? (this.repeater.get(cell) ?? false)
            : this.inputBehind(placement) > 0)
          break
        case 'comparator':
          nextComparator.set(cell, this.comparatorOutput(placement))
          break
        default:
          break
      }
    }

    // Задержки: факел переключается через такт, повторитель — через свою.
    this.commit(this.torch, nextTorch, this.torchTimer, 1)
    for (const placement of this.order.filter((p) => p.block === 'repeater')) {
      const cell = cellOf(placement)
      const delay = Number(/(?:^|\+)delay_(\d)/.exec(placement.variant ?? '')?.[1] ?? 1)
      this.commit(
        this.repeater,
        new Map([[cell, nextRepeater.get(cell) ?? false]]),
        this.repeaterTimer,
        Math.max(1, Math.min(4, delay)),
      )
    }
    for (const [cell, value] of nextComparator) this.comparator.set(cell, value)

    for (const placement of this.order) {
      const cell = cellOf(placement)
      if (placement.block === 'observer') {
        const state = this.stateOf(this.eye(placement))
        if (state !== this.watched.get(cell)) {
          this.watched.set(cell, state)
          this.observer.set(cell, OBSERVER_TICKS + 1)
        }
      }
      if (placement.block === 'copper_bulb') {
        const now = this.activated(placement)
        if (now && !this.bulbEdge.get(cell)) this.bulb.set(cell, !this.bulb.get(cell))
        this.bulbEdge.set(cell, now)
      }
      if (PISTONS.has(placement.block)) {
        const wasExtended = this.piston.get(cell) ?? false
        const powered = this.activated(placement)
        if (powered && !wasExtended) this.piston.set(cell, this.extendPiston(placement))
        else if (!powered && wasExtended) {
          if (placement.block === 'sticky_piston') this.retractPiston(placement)
          this.piston.set(cell, false)
        }
      }
      if (MECHANISMS.has(placement.block)) {
        const active = this.outputActive(placement)
        if (active !== (this.lastActive.get(cell) ?? false)) {
          this.outputEvents.push({ cell, block: placement.block, active })
          this.lastActive.set(cell, active)
        }
      }
    }

    if (!this.stabilizing) {
      this.hopperClock += 1
      if (this.hopperClock >= HOPPER_TICKS) {
        this.hopperClock = 0
        this.tickHoppers()
      }
    }
  }

  /** Один дискретный перенос: сначала выдача вперёд, затем забор сверху. */
  private tickHoppers(): void {
    for (const hopper of this.order.filter((placement) => placement.block === 'hopper')) {
      if (this.activated(hopper)) continue
      const cell = cellOf(hopper)
      const target = step(cell, hopper.facing ?? 'down')
      if (this.moveOne(cell, target)) continue
      this.moveOne(step(cell, 'up'), cell)
    }
  }

  private moveOne(from: Cell, to: Cell): boolean {
    const target = this.at.get(to)
    if (!target || (target.block !== 'hopper' && target.block !== 'chest')) return false
    const source = this.inventory.get(from)
    const stack = source?.find((entry) => entry.count > 0)
    if (!stack || this.addToInventory(to, stack.id, 1, stack.key) !== 0) return false
    stack.count -= 1
    if (stack.count === 0) source!.splice(source!.indexOf(stack), 1)
    return true
  }

  /** Возвращает число предметов, которые не поместились. */
  private addToInventory(cell: Cell, item: string, count: number, stackKey = item): number {
    const placement = this.at.get(cell)
    if (!placement || (placement.block !== 'hopper' && placement.block !== 'chest')) return count
    const slots = placement.block === 'hopper' ? 5 : 27
    const inventory = this.inventory.get(cell) ?? []
    this.inventory.set(cell, inventory)
    let left = Math.max(0, Math.floor(count))
    for (const stack of inventory) {
      if ((stack.key ?? stack.id) !== stackKey || stack.count >= STACK_SIZE) continue
      const moved = Math.min(left, STACK_SIZE - stack.count)
      stack.count += moved
      left -= moved
      if (left === 0) return 0
    }
    while (left > 0 && inventory.length < slots) {
      const moved = Math.min(left, STACK_SIZE)
      inventory.push({ id: item, count: moved, ...(stackKey !== item ? { key: stackKey } : {}) })
      left -= moved
    }
    return left
  }

  private readonly bulbEdge = new Map<Cell, boolean>()

  /** Текущая клетка каждого настоящего блока с учётом предыдущих толчков. */
  private movedWorld(): Map<Cell, SimBlock> {
    const world = new Map<Cell, SimBlock>()
    for (const placement of this.order) {
      const offset = this.pistonShift.get(cellOf(placement)) ?? [0, 0, 0]
      world.set(key(
        placement.x + offset[0],
        placement.y + offset[1],
        placement.z + offset[2],
      ), placement)
    }
    return world
  }

  private shiftBlock(placement: SimBlock, dx: number, dy: number, dz: number): void {
    const cell = cellOf(placement)
    const old = this.pistonShift.get(cell) ?? [0, 0, 0]
    const next: [number, number, number] = [old[0] + dx, old[1] + dy, old[2] + dz]
    if (next.every((value) => value === 0)) this.pistonShift.delete(cell)
    else this.pistonShift.set(cell, next)
  }

  /** Выдвигает поршень и сдвигает непрерывную линию не длиннее 12 блоков. */
  private extendPiston(piston: SimBlock): boolean {
    const facing = piston.facing ?? 'north'
    const [dx, dy, dz] = DIRS[facing]!
    const world = this.movedWorld()
    const line: SimBlock[] = []
    let cursor = this.front(piston)

    while (true) {
      const block = world.get(cursor)
      if (!block) break
      if (PISTON_IMMOVABLE.has(block.block) || line.length >= 12) return false
      line.push(block)
      cursor = step(cursor, facing)
    }
    for (const block of line) this.shiftBlock(block, dx, dy, dz)
    return true
  }

  /** Липкий поршень при втягивании забирает ближайший вытолкнутый блок. */
  private retractPiston(piston: SimBlock): void {
    const facing = piston.facing ?? 'north'
    const [dx, dy, dz] = DIRS[facing]!
    const world = this.movedWorld()
    const destination = this.front(piston)
    const pulled = world.get(step(destination, facing))
    if (!pulled || PISTON_IMMOVABLE.has(pulled.block) || world.has(destination)) return
    this.shiftBlock(pulled, -dx, -dy, -dz)
  }

  /** Инициализирует факелы и логику, не зависая на генераторах. */
  private stabilize(): void {
    const seen = new Set<string>()
    for (let i = 0; i < 64; i++) {
      const before = this.logicState()
      if (seen.has(before)) break
      seen.add(before)
      this.tick()
      if (this.logicState() === before) break
    }
    this.outputEvents = []
  }

  private logicState(): string {
    return JSON.stringify([
      [...this.torch], [...this.repeater], [...this.comparator], [...this.observer],
      [...this.bulb], [...this.dust], [...this.piston],
    ])
  }

  private commit(
    current: Map<Cell, boolean>,
    next: Map<Cell, boolean>,
    timers: Map<Cell, number>,
    delay: number,
  ): void {
    for (const [cell, value] of next) {
      if (value === (current.get(cell) ?? false)) {
        timers.set(cell, 0)
        continue
      }
      const waited = (timers.get(cell) ?? 0) + 1
      if (waited >= delay) {
        current.set(cell, value)
        timers.set(cell, 0)
      } else {
        timers.set(cell, waited)
      }
    }
  }

  // ——— питание ———

  /** Сила, которую клетка отдаёт соседней пыли. */
  private sourceFor(cell: Cell, into: Cell): number {
    const placement = this.at.get(cell)
    if (!placement) return 0
    switch (placement.block) {
      case 'redstone_block':
        return 15
      case 'lever':
        return this.lever.get(cell) ? 15 : 0
      case 'stone_button':
      case 'oak_button':
      case 'stone_pressure_plate':
      case 'oak_pressure_plate':
        return (this.button.get(cell) ?? 0) > 0 ? 15 : 0
      case 'daylight_detector':
        return this.detector.get(cell) ? 15 : 0
      case 'redstone_torch':
      case 'torch':
        // Факел не питает блок, за который держится.
        return this.torch.get(cell) && this.support(placement) !== into ? 15 : 0
      case 'repeater':
        return this.repeater.get(cell) && this.front(placement) === into ? 15 : 0
      case 'comparator':
        return this.front(placement) === into ? (this.comparator.get(cell) ?? 0) : 0
      case 'observer':
        // Наблюдатель отдаёт импульс со спины.
        return (this.observer.get(cell) ?? 0) > 0 && this.back(placement) === into ? 15 : 0
      default:
        return 0
    }
  }

  /** Пыль: максимум из источников и из соседней пыли минус шаг. */
  private spreadDust(): void {
    const wires = this.order.filter((placement) => placement.block === 'redstone')
    this.dust = new Map(wires.map((placement) => [cellOf(placement), 0]))

    for (const placement of wires) {
      const cell = cellOf(placement)
      let best = 0
      for (const direction of Object.keys(DIRS)) {
        const side = step(cell, direction)
        best = Math.max(best, this.sourceFor(side, cell))
        if (this.strong(side) > 0) best = Math.max(best, this.strong(side))
      }
      this.dust.set(cell, best)
    }

    // Затухание — простым перебором: схемы маленькие, шагов не больше 15.
    for (let round = 0; round < 16; round++) {
      let changed = false
      for (const placement of wires) {
        const cell = cellOf(placement)
        const own = this.dust.get(cell) ?? 0
        let best = own
        for (const neighbour of this.wireNeighbours(cell)) {
          best = Math.max(best, (this.dust.get(neighbour) ?? 0) - 1)
        }
        if (best > own) {
          this.dust.set(cell, best)
          changed = true
        }
      }
      if (!changed) break
    }
  }

  /** Соседняя пыль: на одном уровне и на ступеньку вверх или вниз. */
  private wireNeighbours(cell: Cell): Cell[] {
    const out: Cell[] = []
    for (const direction of ['north', 'south', 'east', 'west']) {
      for (const height of [0, 1, -1]) {
        const side = height === 0 ? step(cell, direction) : step(step(cell, direction), height > 0 ? 'up' : 'down')
        if (this.at.get(side)?.block === 'redstone') out.push(side)
      }
    }
    return out
  }

  /** Сильное питание блока: компонент, прикреплённый к нему, или прибор в него. */
  private strong(cell: Cell): number {
    const block = this.at.get(cell)
    if (!block || NON_SOLID.has(block.block)) return 0

    let best = 0
    for (const direction of Object.keys(DIRS)) {
      const side = step(cell, direction)
      const neighbour = this.at.get(side)
      if (!neighbour) continue
      switch (neighbour.block) {
        case 'lever':
        case 'stone_button':
        case 'oak_button':
        case 'stone_pressure_plate':
        case 'oak_pressure_plate':
          if (this.support(neighbour) === cell) best = Math.max(best, this.sourceFor(side, cell))
          break
        case 'redstone_torch':
        case 'torch':
          // Факел сильно питает блок над собой.
          if (direction === 'down' && this.torch.get(side)) best = 15
          break
        case 'repeater':
          if (this.front(neighbour) === cell && this.repeater.get(side)) best = 15
          break
        case 'comparator':
          if (this.front(neighbour) === cell) best = Math.max(best, this.comparator.get(side) ?? 0)
          break
        default:
          break
      }
    }
    return best
  }

  /** Слабое питание: пыль на блоке и пыль, смотрящая в него. */
  private weak(cell: Cell): number {
    const block = this.at.get(cell)
    if (!block || NON_SOLID.has(block.block)) return 0
    let best = 0
    const wireTowardBlock: Record<string, string> = { north: 's', south: 'n', east: 'w', west: 'e' }
    for (const direction of Object.keys(DIRS)) {
      const side = step(cell, direction)
      const wire = this.at.get(side)
      if (wire?.block !== 'redstone') continue
      if (direction === 'down') continue
      if (wireTowardBlock[direction] && !wire.variant?.includes(wireTowardBlock[direction]!)) continue
      best = Math.max(best, this.dust.get(side) ?? 0)
    }
    return best
  }

  private powered(cell: Cell): boolean {
    return this.strong(cell) > 0 || this.weak(cell) > 0
  }

  /** Включён ли механизм: сосед-компонент, пыль рядом или запитанный блок. */
  private activated(placement: SimBlock): boolean {
    const cell = cellOf(placement)
    for (const direction of Object.keys(DIRS)) {
      const side = step(cell, direction)
      if (this.sourceFor(side, cell) > 0) return true
      if ((this.dust.get(side) ?? 0) > 0) return true
      if (this.strong(side) > 0 || this.weak(side) > 0) return true
    }
    // Java quasi-connectivity для поршней и раздатчиков.
    if (PISTONS.has(placement.block) || placement.block === 'dispenser' || placement.block === 'dropper') {
      const above = step(cell, 'up')
      if (this.strong(above) > 0 || this.weak(above) > 0 || this.sourceAround(above) > 0) return true
    }
    return false
  }

  private sourceAround(cell: Cell): number {
    let best = 0
    for (const direction of Object.keys(DIRS)) {
      const side = step(cell, direction)
      best = Math.max(
        best,
        this.sourceFor(side, cell),
        this.dust.get(side) ?? 0,
        this.strong(side),
        this.weak(side),
      )
    }
    return best
  }

  private inputBehind(placement: SimBlock): number {
    const behind = this.back(placement)
    return Math.max(
      this.dust.get(behind) ?? 0,
      this.sourceFor(behind, cellOf(placement)),
      this.strong(behind),
    )
  }

  /** A powered repeater aimed into either side freezes this repeater's output. */
  private repeaterLocked(placement: SimBlock): boolean {
    const horizontal = placement.facing === 'east' || placement.facing === 'west'
      ? ['north', 'south']
      : ['east', 'west']
    const cell = cellOf(placement)
    return horizontal.some((direction) => {
      const side = step(cell, direction)
      const neighbour = this.at.get(side)
      return neighbour?.block === 'repeater' && this.front(neighbour) === cell && this.repeater.get(side)
    })
  }

  private comparatorOutput(placement: SimBlock): number {
    const behind = this.back(placement)
    const container = this.at.get(behind)
    let back = Math.max(
      this.dust.get(behind) ?? 0,
      this.sourceFor(behind, cellOf(placement)),
      this.strong(behind),
    )
    back = Math.max(back, this.container.get(behind) ?? 0, this.inventorySignal(behind))
    // Компаратор читает содержимое: у медной лампы это её состояние.
    if (container?.block === 'copper_bulb') back = this.bulb.get(behind) ? 15 : 0

    const axis = placement.facing === 'east' || placement.facing === 'west' ? ['north', 'south'] : ['east', 'west']
    let side = 0
    for (const direction of axis) {
      const at = step(cellOf(placement), direction)
      side = Math.max(side, this.dust.get(at) ?? 0, this.sourceFor(at, cellOf(placement)), this.strong(at))
    }

    const subtract = placement.variant?.split('+').some((atom) => atom === 'subtract' || atom === 'mode=subtract')
    return subtract ? Math.max(0, back - side) : (back >= side ? back : 0)
  }

  /** Testable signal/state access without coupling tests to rendered colors. */
  signalAt(x: number, y: number, z: number): number {
    const cell = key(x, y, z)
    const placement = this.at.get(cell)
    if (!placement) return 0
    if (placement.block === 'redstone') return this.dust.get(cell) ?? 0
    if (placement.block === 'comparator') return this.comparator.get(cell) ?? 0
    if (placement.block === 'redstone_torch' || placement.block === 'torch') return this.torch.get(cell) ? 15 : 0
    if (placement.block === 'repeater') return this.repeater.get(cell) ? 15 : 0
    if (placement.block === 'observer') return (this.observer.get(cell) ?? 0) > 0 ? 15 : 0
    return this.activeAtom(placement) ? 15 : 0
  }

  /** Точный уровень, назначенный сценарием контейнеру. */
  containerSignalAt(x: number, y: number, z: number): number {
    const cell = key(x, y, z)
    return Math.max(this.container.get(cell) ?? 0, this.inventorySignal(cell))
  }

  private inventorySignal(cell: Cell): number {
    const placement = this.at.get(cell)
    const slots = placement?.block === 'hopper' ? 5 : placement?.block === 'chest' ? 27 : 0
    if (slots === 0) return 0
    const used = (this.inventory.get(cell) ?? []).reduce(
      (sum, stack) => sum + Math.min(STACK_SIZE, stack.count) / STACK_SIZE,
      0,
    )
    return used > 0 ? Math.floor(1 + (14 * used) / slots) : 0
  }

  private support(placement: SimBlock): Cell {
    const cell = cellOf(placement)
    const face = placement.variant?.split('+').find((atom) => atom === 'wall' || atom === 'ceiling')
    if (face === 'wall' && placement.facing) return step(cell, OPPOSITE[placement.facing]!)
    if (face === 'ceiling') return step(cell, 'up')
    return step(cell, 'down')
  }

  private front(placement: SimBlock): Cell {
    return step(cellOf(placement), placement.facing ?? 'north')
  }

  private back(placement: SimBlock): Cell {
    return step(cellOf(placement), OPPOSITE[placement.facing ?? 'north']!)
  }

  /** Клетка, за которой следит наблюдатель. */
  private eye(placement: SimBlock): Cell {
    return this.front(placement)
  }

  /** Отпечаток клетки: по его смене наблюдатель и понимает, что что-то было. */
  private stateOf(cell: Cell): string {
    const block = this.at.get(cell)
    if (!block) return '-'
    return [
      block.block,
      block.facing ?? '',
      block.variant ?? '',
      this.torch.get(cell) ? 1 : 0,
      this.repeater.get(cell) ? 1 : 0,
      this.comparator.get(cell) ?? 0,
      this.piston.get(cell) ? 1 : 0,
      this.bulb.get(cell) ? 1 : 0,
      (this.observer.get(cell) ?? 0) > 0 ? 1 : 0,
    ].join(':')
  }

  // ——— кадр для отрисовки ———

  /** Состояние блока словом: им же назван испечённый вариант геометрии. */
  private activeAtom(placement: SimBlock): string | null {
    const cell = cellOf(placement)
    switch (placement.block) {
      case 'redstone_torch':
      case 'torch':
        return this.torch.get(cell) ? null : 'unlit'
      case 'repeater':
        return this.repeater.get(cell) ? 'powered' : null
      case 'comparator':
        return (this.comparator.get(cell) ?? 0) > 0 ? 'powered' : null
      case 'lever':
        return this.lever.get(cell) ? 'powered' : null
      case 'stone_button':
      case 'oak_button':
      case 'stone_pressure_plate':
      case 'oak_pressure_plate':
        return (this.button.get(cell) ?? 0) > 0 ? 'powered' : null
      case 'daylight_detector':
        return this.detector.get(cell) ? 'inverted' : null
      case 'copper_bulb':
        return this.bulb.get(cell) ? 'lit' : null
      case 'redstone_lamp':
        return this.activated(placement) ? 'lit' : null
      case 'observer':
        return (this.observer.get(cell) ?? 0) > 0 ? 'powered' : null
      case 'piston':
      case 'sticky_piston':
        return this.piston.get(cell) ? 'extended' : null
      case 'iron_door':
      case 'oak_door':
      case 'oak_trapdoor':
      case 'iron_trapdoor':
        return this.activated(placement) ? 'open' : null
      default:
        return null
    }
  }

  /** Логическое состояние выхода независимо от наличия отдельной 3D-модели. */
  private outputActive(placement: SimBlock): boolean {
    const cell = cellOf(placement)
    if (placement.block === 'observer') return (this.observer.get(cell) ?? 0) > 0
    if (PISTONS.has(placement.block)) return this.piston.get(cell) ?? false
    if (placement.block === 'copper_bulb') return this.bulb.get(cell) ?? false
    return this.activated(placement)
  }

  /**
   * Постройка в её нынешнем состоянии.
   *
   * Выдвинутый поршень занимает соседнюю клетку головой. Блоки используют
   * сохранённые смещения: обычный поршень оставляет вытолкнутый блок на месте,
   * а липкий при снятии питания действительно втягивает его обратно.
   */
  frame(): SimBlock[] {
    const heads: SimBlock[] = []

    for (const placement of this.order) {
      const cell = cellOf(placement)
      if (!PISTONS.has(placement.block) || !this.piston.get(cell)) continue
      const facing = placement.facing ?? 'north'
      const [dx, dy, dz] = DIRS[facing]!
      heads.push({
        x: placement.x + dx,
        y: placement.y + dy,
        z: placement.z + dz,
        block: 'piston_head',
        facing,
        ...(placement.block === 'sticky_piston' ? { variant: 'sticky' } : {}),
        step: placement.step,
      })
    }

    const out = this.order.map((placement) => {
      const cell = cellOf(placement)
      const offset = this.pistonShift.get(cell)
      const base = offset ? {
        ...placement,
        x: placement.x + offset[0],
        y: placement.y + offset[1],
        z: placement.z + offset[2],
      } : placement
      if (placement.block === 'redstone') {
        return { ...base, tint: dustTint(this.dust.get(cell) ?? 0) }
      }
      const atom = this.activeAtom(placement)
      if (!atom) return base
      return { ...base, variant: base.variant ? `${base.variant}+${atom}` : atom }
    })

    return [...out, ...heads]
  }
}

/**
 * Цвет пыли по силе сигнала — та же формула, что в игре: от почти чёрного
 * при нуле до яркого при пятнадцати.
 */
export function dustTint(power: number): number {
  const f = power / 15
  const red = Math.round((f * 0.6 + 0.4 * (power > 0 ? 1 : 0.75)) * 255)
  return (Math.min(255, red) << 16) | (power > 0 ? 0x0a00 : 0) | 0
}
