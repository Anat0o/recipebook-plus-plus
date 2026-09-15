/**
 * Проверки данных: самодроп, предметы только из команд, схемы и гайды.
 *
 * Главное здесь — порядок: признак «получить нельзя» считается по полному
 * списку источников, ДО того как интерфейс спрячет самодроп. Перепутать эти
 * два шага — значит стереть из каталога 94 честно добываемых блока.
 */
import { describe, expect, it } from 'vitest'
import { buildGuides, guideMaterials, placedMaterials, ALL_GUIDES } from './build-guides.ts'
import { buildMultiblocks } from './build-multiblocks.ts'
import { MULTIBLOCKS } from './curated/multiblocks.ts'
import { buildItems } from './build-items.ts'
import { buildLoot } from './build-loot.ts'
import { buildRecipes } from './build-recipes.ts'
import { buildIndex, normalizeId } from './build-index.ts'
import { TagIndex } from './mc/tags.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DEFAULT_VERSION } from './config.ts'
import type { Source } from '../src/lib/schema.ts'
import { BLOCKS_WITHOUT_ITEM } from './curated/block-models.ts'
import { Redstone } from '../src/lib/redstone.ts'
import { toPlacements } from './mc/placements.ts'

const DATA_ROOT = `${sourceDir(DEFAULT_VERSION, 'data-json')}/data/minecraft`
const itemTags = new TagIndex(DATA_ROOT, 'item')
const { items } = buildItems(DEFAULT_VERSION)
const knownItems = new Set(items.map((item) => item.id))
const loot = buildLoot(DATA_ROOT, itemTags)
const recipes = buildRecipes(DATA_ROOT, itemTags, knownItems)

const short = (id: string): string => normalizeId(id)
const pages = buildIndex(
  [...recipes.sources, ...loot.sources].map((source) =>
    source.kind === 'loot'
      ? { ...source, origin: short(source.origin), result: { ...source.result, id: short(source.result.id) } }
      : source,
  ) as Source[],
)

describe('самодроп блоков', () => {
  const selfDrops = loot.sources.filter((s) => s.kind === 'loot' && s.selfDrop)

  it('помечается только «блок даёт сам себя без условий»', () => {
    expect(selfDrops.length).toBeGreaterThan(500)
    for (const source of selfDrops) {
      if (source.kind !== 'loot') continue
      expect(source.context).toBe('block')
      expect(short(source.origin)).toBe(short(source.result.id))
      expect(source.conditions).toEqual([])
    }
  })

  it('дроп с условием не помечается: камень отдаёт себя только с шёлком', () => {
    const stone = loot.sources.find(
      (s) => s.kind === 'loot' && short(s.origin) === 'stone' && short(s.result.id) === 'stone',
    )
    expect(stone).toBeDefined()
    expect(stone && stone.kind === 'loot' && stone.selfDrop).toBeUndefined()
    expect(stone && stone.kind === 'loot' && stone.conditions).toContain('silk_touch')
  })

  it('дроп другого блока не помечается: тропинка даёт землю', () => {
    const path = loot.sources.find(
      (s) => s.kind === 'loot' && short(s.origin) === 'dirt_path' && short(s.result.id) === 'dirt',
    )
    expect(path && path.kind === 'loot' && path.selfDrop).toBeUndefined()
  })
})

describe('предметы только из команд', () => {
  const withoutSources = items.filter((item) => (pages.get(item.id)?.from.length ?? 0) === 0)

  it('это яйца призыва и служебные блоки', () => {
    const ids = withoutSources.map((item) => item.id)
    expect(ids).toContain('barrier')
    expect(ids).toContain('command_block')
    expect(ids).toContain('bedrock')
    expect(ids.filter((id) => id.endsWith('_spawn_egg')).length).toBeGreaterThan(50)
  })

  it('блоки, у которых самодроп единственный источник, доступными остаются', () => {
    // Без этого правила из каталога исчезли бы камень Энда, листва и бетон.
    const hidden = new Set(withoutSources.map((item) => item.id))
    for (const id of ['end_stone', 'basalt', 'oak_leaves', 'green_concrete', 'stripped_jungle_log']) {
      expect(knownItems.has(id), id).toBe(true)
      expect(hidden.has(id), id).toBe(false)
    }
  })
})

describe('многоблочные постройки', () => {
  const { data, problems } = buildMultiblocks(knownItems)

  it('собираются все и без замечаний', () => {
    expect(data.length).toBe(MULTIBLOCKS.length)
    expect(problems).toEqual([])
  })

  it('участники постройки существуют и постройка к ним привязана', () => {
    const wither = data.find((entry) => entry.id === 'wither')
    expect(wither?.parts).toContain('wither_skeleton_skull')
    expect(wither?.parts).toContain('soul_sand')

    const golem = data.find((entry) => entry.id === 'iron_golem')
    expect(golem?.parts).toContain('iron_block')
    expect(golem?.parts).toContain('carved_pumpkin')
  })

  it('у каждой постройки есть шаги и пояснение на двух языках', () => {
    for (const entry of data) {
      expect(entry.steps.length, entry.id).toBeGreaterThan(0)
      for (const language of ['ru', 'en']) {
        expect(entry.names[language], entry.id).toBeTruthy()
        expect(entry.notes[language], entry.id).toBeTruthy()
      }
    }
  })
})

describe('гайды', () => {
  const { data, problems } = buildGuides(knownItems)

  it('собираются все и без замечаний', () => {
    expect(data.length).toBe(ALL_GUIDES.length)
    expect(problems).toEqual([])
  })

  it('в каждом разделе не меньше двенадцати гайдов', () => {
    for (const category of ['farm', 'redstone'] as const) {
      expect(data.filter((guide) => guide.category === category).length).toBeGreaterThanOrEqual(12)
    }
  })

  it('каждый блок постройки и каждый материал существуют в версии', () => {
    for (const guide of data) {
      expect(knownItems.has(guide.icon), guide.icon).toBe(true)
      for (const material of guide.materials) {
        expect(knownItems.has(material.id), `${guide.id}: ${material.id}`).toBe(true)
      }
      for (const build of guide.builds) {
        for (const placement of build.placements) {
          expect(knownItems.has(placement.block) || BLOCKS_WITHOUT_ITEM.has(placement.block), `${guide.id}: ${placement.block}`).toBe(true)
        }
      }
    }
  })

  it('у каждого гайда указаны издания, материалы, шаги и хотя бы одна схема', () => {
    for (const guide of data) {
      expect(guide.editions.length, guide.id).toBeGreaterThan(0)
      for (const edition of guide.editions) expect(['java', 'bedrock']).toContain(edition)
      expect(guide.materials.length, guide.id).toBeGreaterThan(0)
      expect(guide.builds.length, guide.id).toBeGreaterThan(0)
      // Шаг — это кнопка, показывающая свою часть постройки: без описаний
      // кнопки нечем подписать, а лишние описания разъедутся с картинкой.
      for (const build of guide.builds) {
        const steps = Math.max(0, ...build.placements.map((placement) => placement.step))
        expect(build.steps.length, `${guide.id}: ${build.names.ru}`).toBe(steps)
      }
    }
  })

  it('тексты есть на обоих языках', () => {
    for (const guide of data) {
      for (const language of ['ru', 'en']) {
        expect(guide.names[language], guide.id).toBeTruthy()
        expect(guide.summaries[language], guide.id).toBeTruthy()
        expect(guide.notes[language]?.length, guide.id).toBeGreaterThan(0)
        for (const build of guide.builds) {
          expect(build.names[language], guide.id).toBeTruthy()
          for (const step of build.steps) expect(step[language], guide.id).toBeTruthy()
        }
      }
    }
  })

  it('идентификаторы уникальны', () => {
    const ids = data.map((guide) => guide.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('в мире стоят блоки, а не предметы-маркеры', () => {
    const forbidden = new Set(['water_bucket', 'lava_bucket', 'melon_seeds', 'pumpkin_seeds', 'wheat_seeds'])
    for (const guide of data) for (const build of guide.builds) for (const placement of build.placements) {
      expect(forbidden.has(placement.block), `${guide.id}: ${placement.block}`).toBe(false)
    }
  })

  it('двери и кровати содержат обе физические части', () => {
    for (const guide of data) for (const build of guide.builds) {
      const doors = build.placements.filter((entry) => entry.block.endsWith('_door'))
      for (const door of doors.filter((entry) => entry.variant?.includes('half=lower'))) {
        expect(doors.some((entry) => entry.x === door.x && entry.y === door.y + 1 && entry.z === door.z && entry.variant?.includes('half=upper')), `${guide.id}: incomplete door`).toBe(true)
      }
      const beds = build.placements.filter((entry) => entry.block.endsWith('_bed'))
      expect(beds.filter((entry) => entry.variant?.includes('part=foot')).length, `${guide.id}: bed feet`).toBe(beds.filter((entry) => entry.variant?.includes('part=head')).length)
    }
  })

  it('сущности и события ссылаются на уникальные существующие id', () => {
    for (const guide of data) for (const build of guide.builds) {
      const ids = build.entities.map((entity) => entity.id)
      expect(new Set(ids).size, guide.id).toBe(ids.length)
      const known = new Set(ids)
      for (const event of build.animation?.events ?? []) {
        if (event.type === 'move' || event.type === 'show') expect(known.has(event.entity), `${guide.id}: ${event.entity}`).toBe(true)
        if (event.type === 'insert') {
          expect(knownItems.has(event.item), `${guide.id}: unknown inserted item ${event.item}`).toBe(true)
          const target = build.placements.find((entry) => entry.x === event.x && entry.y === event.y && entry.z === event.z)
          expect(['hopper', 'chest'], `${guide.id}: insertion target`).toContain(target?.block)
        }
      }
      for (const placement of build.placements.filter((entry) => entry.inventory)) {
        expect(['hopper', 'chest'], `${guide.id}: inventory on ${placement.block}`).toContain(placement.block)
        expect(placement.inventory!.length, `${guide.id}: too many slots`).toBeLessThanOrEqual(placement.block === 'hopper' ? 5 : 27)
        for (const stack of placement.inventory!) {
          expect(knownItems.has(stack.id), `${guide.id}: unknown inventory item ${stack.id}`).toBe(true)
          expect(stack.count, `${guide.id}: invalid stack`).toBeGreaterThan(0)
          expect(stack.count, `${guide.id}: overstacked item`).toBeLessThanOrEqual(64)
        }
      }
    }
  })

  it('фильтр и одноразовый таймер не подменяют инвентарь готовым сигналом', () => {
    const filter = data.find((guide) => guide.id === 'item_filter')!.builds[0]!
    const timer = data.find((guide) => guide.id === 'hopper_timer')!.builds[0]!
    for (const build of [filter, timer]) {
      expect(build.animation!.events.some((event) => event.type === 'insert')).toBe(true)
      expect(build.animation!.events.some((event) => event.type === 'container')).toBe(false)
    }
  })

  it('не содержит дубликатов координат и пересекающихся видимых сущностей', () => {
    for (const guide of data) for (const build of guide.builds) {
      const cells = build.placements.map((entry) => `${entry.x},${entry.y},${entry.z}`)
      expect(new Set(cells).size, `${guide.id}: duplicate block cell`).toBe(cells.length)
      const entities = build.entities.filter((entry) => entry.visible !== false)
        .map((entry) => `${entry.x},${entry.y},${entry.z}`)
      expect(new Set(entities).size, `${guide.id}: overlapping entities`).toBe(entities.length)
    }
  })

  it('каждый блок схемы обеспечен соответствующим материалом', () => {
    const materialFor: Record<string, string> = {
      water: 'water_bucket', lava: 'lava_bucket', melon_stem: 'melon_seeds',
      wheat: 'wheat_seeds', farmland: 'dirt', bubble_column: 'water_bucket',
    }
    for (const guide of data) {
      const materials = new Set(guide.materials.map((entry) => entry.id))
      for (const build of guide.builds) for (const placement of build.placements) {
        expect(
          placement.block === 'spawner' || materials.has(placement.block) || materials.has(materialFor[placement.block] ?? ''),
          `${guide.id}: no material for ${placement.block}`,
        ).toBe(true)
      }
    }
  })

  it('количество строительных материалов считается по координатам схемы', () => {
    for (const source of ALL_GUIDES) {
      const published = data.find((guide) => guide.id === source.id)!
      expect(published.materials, source.id).toEqual(guideMaterials(source))

      const expected = new Map(published.materials.map((entry) => [entry.id, entry.count]))
      const builds = source.schematics.map((schematic) => placedMaterials(toPlacements(schematic.layers)))
      for (const id of new Set(builds.flatMap((build) => [...build.keys()]))) {
        const counts = builds.map((build) => build.get(id) ?? 0)
        const needed = source.buildMode === 'alternatives'
          ? Math.max(...counts)
          : counts.reduce((sum, count) => sum + count, 0)
        expect(expected.get(id), `${source.id}: wrong count for ${id}`).toBe(needed)
      }
    }
  })

  it('не предлагает недобываемую грядку как материал', () => {
    const wheat = data.find((guide) => guide.id === 'wheat')!
    expect(wheat.materials.some((entry) => entry.id === 'farmland')).toBe(false)
    expect(wheat.materials).toContainEqual({ id: 'dirt', count: 23 })
    expect(wheat.materials).toContainEqual({ id: 'wooden_hoe', count: 1 })
    expect(data.find((guide) => guide.id === 'sugar_cane')!.materials.some((entry) => entry.id === 'wooden_hoe')).toBe(false)
  })

  it('исправляет известные заниженные списки крупных схем', () => {
    const materials = (id: string): Map<string, number> => new Map(
      data.find((guide) => guide.id === id)!.materials.map((entry) => [entry.id, entry.count]),
    )
    expect(materials('iron').get('glass')).toBe(125)
    expect(materials('creeper').get('oak_trapdoor')).toBe(81)
    expect(materials('item_filter').get('hopper')).toBe(4)
    expect(materials('item_filter').get('iron_ingot')).toBe(41)
    expect(materials('item_filter').get('stick')).toBe(4)
    expect(materials('spawner').get('cobblestone')).toBeGreaterThan(358)
  })

  it('каждая ферма доводит предмет до показанного целевого контейнера', () => {
    for (const guide of data.filter((entry) => entry.category === 'farm')) {
      const events = guide.builds.flatMap((build) => build.animation?.events ?? [])
      const itemIds = new Set(guide.builds.flatMap((build) => build.entities)
        .filter((entity) => entity.type === 'item').map((entity) => entity.id))
      expect(events.some((event) => event.type === 'show' && itemIds.has(event.entity) && event.visible), `${guide.id}: loot never appears`).toBe(true)
      expect(events.some((event) => event.type === 'move' && itemIds.has(event.entity)), `${guide.id}: loot never moves`).toBe(true)
      const chests = new Set(guide.builds.flatMap((build) => build.placements)
        .filter((entry) => entry.block === 'chest').map((entry) => `${entry.x},${entry.y},${entry.z}`))
      expect(events.some((event) => event.type === 'container' && event.signal > 0 && chests.has(`${event.x},${event.y},${event.z}`)), `${guide.id}: no target chest event`).toBe(true)
    }
  })

  it('автоматизированные фермы получают реальное выходное событие от симулятора', () => {
    const outputs: Record<string, string> = {
      sugar_cane: 'piston', bamboo: 'piston', melon_pumpkin: 'piston', bone_meal: 'piston',
      chicken: 'dispenser', honey: 'dispenser', blaze: 'piston',
    }
    for (const [guideId, expectedBlock] of Object.entries(outputs)) {
      const guide = data.find((entry) => entry.id === guideId)!
      const build = guide.builds[0]!
      const sim = new Redstone(build.placements)
      const actual: string[] = []
      for (let tick = 1; tick <= build.animation!.duration; tick += 1) {
        for (const event of build.animation!.events.filter((entry) => entry.tick === tick)) {
          if (event.type === 'press') sim.press(`${event.x},${event.y},${event.z}`)
          if (event.type === 'block') sim.setBlock(event.x, event.y, event.z, event.block, event.facing, event.variant)
          if (event.type === 'container') sim.setContainerSignal(event.x, event.y, event.z, event.signal)
        }
        sim.tick()
        actual.push(...sim.drainEvents().filter((event) => event.active).map((event) => event.block))
      }
      expect(actual, guideId).toContain(expectedBlock)
    }
  })
})
