/**
 * Сборка всех статических данных сайта.
 * Запуск: npm run build:data [-- версия …]
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Source } from '../src/lib/schema.ts'
import { VERSIONS, DEFAULT_VERSION } from './config.ts'
import { fetchAll, sourceDir } from './fetch-mcmeta.ts'
import { buildItems } from './build-items.ts'
import { buildSprites } from './build-sprites.ts'
import { buildRecipes } from './build-recipes.ts'
import { buildLoot } from './build-loot.ts'
import { buildTrades } from './build-trades.ts'
import { buildBrewing } from './build-brewing.ts'
import { buildEnchantments } from './build-enchantments.ts'
import { buildBanners } from './build-banners.ts'
import { buildArmorTrims } from './build-armor-trims.ts'
import { buildTiles } from './build-tiles.ts'
import { buildMultiblocks, multiblockBlocks } from './build-multiblocks.ts'
import { buildGuides, schematicBlocks, ALL_GUIDES } from './build-guides.ts'
import { buildBlocks } from './build-blocks.ts'
import { MULTIBLOCKS } from './curated/multiblocks.ts'
import { buildIndex, normalizeId, toShards, SHARD_COUNT } from './build-index.ts'
import { TagIndex } from './mc/tags.ts'
import { SPECIAL_SOURCES } from './curated/special-sources.ts'
import { BLOCKS_WITHOUT_ITEM } from './curated/block-models.ts'

const FINAL_OUT_ROOT = 'public/data'
mkdirSync('public', { recursive: true })
const OUT_ROOT = mkdtempSync('public/.data-build-')
// Исключение на любом этапе оставляет предыдущий опубликованный набор целым,
// а незавершённый staging удаляется при завершении процесса.
process.on('exit', () => {
  if (existsSync(OUT_ROOT)) rmSync(OUT_ROOT, { recursive: true, force: true })
})
const STATIONS = [
  'crafting_table', 'furnace', 'blast_furnace', 'smoker', 'campfire', 'stonecutter',
  'smithing_table', 'brewing_stand', 'enchanting_table', 'anvil', 'grindstone', 'loom',
  'cartography_table', 'composter', 'beacon',
]

/** Отчёт покрытия — на нём стоит проверка `npm run check:coverage`. */
export interface CoverageReport {
  version: string
  items: number
  icons: { rendered: number; approx: number; missing: number }
  recipes: {
    /** Все прочитанные JSON-записи. */
    read: number
    /** Записи, сохранённые в каталоге, включая честные динамические операции. */
    published: number
    /** Осознанно пропущенные записи, разбитые по типу. */
    intentionallySkipped: number
    unsupported: Record<string, number>
  }
  loot: { tables: number; sources: number; unknown: string[] }
  trades: number
  dataDrivenTrades: boolean
  itemsWithoutSources: string[]
}

/** Идентификаторы внутри данных приводим к коротким: `minecraft:diamond` → `diamond`. */
function normalizeSource(source: Source): Source {
  const fixStack = <T extends { id: string } | null>(s: T): T =>
    s ? ({ ...s, id: normalizeId(s.id) } as T) : s
  const fixIngredient = <T extends { items: string[]; tag?: string } | null>(i: T): T =>
    i ? ({ ...i, items: i.items.map(normalizeId) } as T) : i

  switch (source.kind) {
    case 'craft':
      return { ...source, grid: source.grid.map(fixIngredient), result: fixStack(source.result) }
    case 'cook':
    case 'stonecut':
      return { ...source, ingredient: fixIngredient(source.ingredient), result: fixStack(source.result) }
    case 'smith':
      return {
        ...source,
        template: fixIngredient(source.template),
        base: fixIngredient(source.base),
        addition: fixIngredient(source.addition),
        result: fixStack(source.result),
      }
    case 'transmute':
      return {
        ...source,
        input: fixIngredient(source.input),
        material: fixIngredient(source.material),
        result: fixStack(source.result),
      }
    case 'loot':
      return { ...source, origin: normalizeId(source.origin), result: fixStack(source.result) }
    case 'trade':
      return { ...source, cost: source.cost.map((c) => fixStack(c)), result: fixStack(source.result) }
    case 'dynamic':
      return { ...source, result: fixStack(source.result) }
    case 'hardcoded':
      return { ...source, result: { ...source.result, id: normalizeId(source.result.id) } }
  }
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const targets = requested.length > 0 ? VERSIONS.filter((v) => requested.includes(v.id)) : VERSIONS
if (targets.length === 0) {
  console.error('Не найдено ни одной из указанных версий в tools/config.ts')
  process.exit(1)
}

fetchAll(targets.map((v) => v.id))

const reports: CoverageReport[] = []
const publishedVersions: { id: string; label: string; revision: string }[] = []

for (const version of targets) {
  const started = Date.now()
  const outDir = join(OUT_ROOT, version.id)
  mkdirSync(join(outDir, 'item'), { recursive: true })
  console.log(`\n=== ${version.id} ===`)

  const dataRoot = `${sourceDir(version.id, 'data-json')}/data/minecraft`
  const itemTags = new TagIndex(dataRoot, 'item')

  const { items, missingNames, entityNames } = buildItems(version.id)
  console.log(`предметов: ${items.length}${missingNames.length ? `, без названия: ${missingNames.length}` : ''}, тегов: ${itemTags.size}`)

  const knownItems = new Set(items.map((item) => item.id))
  const recipes = buildRecipes(dataRoot, itemTags, knownItems)
  const unsupportedCount = Object.values(recipes.unsupported).reduce((a, b) => a + b, 0)
  console.log(`рецептов: ${recipes.sources.length} из ${recipes.fileCount} файлов${unsupportedCount ? `, не разобрано: ${unsupportedCount}` : ''}`)

  const loot = buildLoot(dataRoot, itemTags)
  console.log(`таблиц добычи: ${loot.tableCount} → источников: ${loot.sources.length}`)
  if (loot.unknown.length > 0) console.log('  неизвестные конструкции:', loot.unknown)

  const trades = buildTrades(dataRoot, version.id)
  console.log(`сделок с жителями: ${trades.sources.length} у ${trades.professions} профессий`)

  const brewing = buildBrewing(version.id, knownItems)
  console.log(
    `варка: ${brewing.base.length} основ, ${brewing.effects.length} эффектов` +
      (brewing.skipped.length > 0 ? `, пропущено: ${brewing.skipped.join('; ')}` : ''),
  )

  const enchantments = buildEnchantments(version.id, dataRoot)
  console.log(`зачарований: ${enchantments.length}`)

  const banners = await buildBanners(version.id, dataRoot, knownItems, outDir)
  const needItem = banners.data.patterns.filter((pattern) => pattern.patternItem).length
  console.log(
    `узоров баннеров: ${banners.data.patterns.length} (с образцом: ${needItem}), ` +
      `дизайнов: ${banners.data.designs.length}`,
  )
  if (banners.problems.length > 0) console.log('  замечания:', banners.problems.join('; '))

  const armorTrims = await buildArmorTrims(version.id, dataRoot, knownItems, outDir)
  console.log(
    `отделок брони: ${armorTrims.data.patterns.length} узоров × ` +
      `${armorTrims.data.materials.length} материалов × ${armorTrims.data.armor.length} комплектов`,
  )
  if (armorTrims.problems.length > 0) console.log('  замечания:', armorTrims.problems.join('; '))

  // Геометрия нужна только тем блокам, что реально встречаются в схемах.
  // Ключ несёт направление и форму (`redstone^east#nse`) — в реестре ищем без них.
  const usedBlocks = [...schematicBlocks(ALL_GUIDES), ...multiblockBlocks()].filter((key) => {
    const id = key.split(/[\^#]/)[0]!
    return knownItems.has(id) || BLOCKS_WITHOUT_ITEM.has(id)
  })
  const geometry = await buildBlocks(version.id, usedBlocks, outDir)
  const faceCount = geometry.data.blocks.reduce((sum, block) => sum + block.faces.length, 0)
  console.log(
    `моделей блоков: ${geometry.data.blocks.length} из ${usedBlocks.length}, ` +
      `граней: ${faceCount}, атлас ${geometry.data.atlasWidth}×${geometry.data.atlasHeight}`,
  )
  if (geometry.problems.length > 0) console.log('  замечания:', geometry.problems.join('; '))

  const tiles = await buildTiles(version.id, outDir)

  const { sheet, misses } = await buildSprites(version.id, outDir)
  console.log(`иконок: ${Object.keys(sheet.index).length}, приблизительных: ${sheet.approx.length}, без иконки: ${misses.length}`)

  // Курируемые источники добавляем только тем предметам, которые есть в версии.
  const special: Source[] = SPECIAL_SOURCES.filter((entry) => knownItems.has(entry.result)).map((entry) => ({
    kind: 'hardcoded',
    result: { id: entry.result },
    note: entry.note,
    icon: entry.icon,
  }))
  console.log(`курируемых источников: ${special.length} из ${SPECIAL_SOURCES.length}`)

  const allSources = [...recipes.sources, ...loot.sources, ...trades.sources, ...special].map(normalizeSource)
  const pages = buildIndex(allSources)

  const guides = buildGuides(knownItems)
  console.log(`гайдов: ${guides.data.length} из ${ALL_GUIDES.length}`)
  if (guides.problems.length > 0) console.log('  пропущено:', guides.problems.join('; '))

  const multiblocks = buildMultiblocks(knownItems)
  console.log(`многоблочных построек: ${multiblocks.data.length} из ${MULTIBLOCKS.length}`)
  if (multiblocks.problems.length > 0) console.log('  пропущено:', multiblocks.problems.join('; '))

  // Постройку видно на карточке каждого её участника — в разделе «Использование».
  for (const entry of multiblocks.data) {
    for (const part of entry.parts) {
      const page = pages.get(part) ?? { from: [], uses: [] }
      ;(page.multiblocks ??= []).push(entry.id)
      pages.set(part, page)
    }
  }

  const shards = toShards(pages)
  shards.forEach((shard, i) => writeFileSync(join(outDir, 'item', `${i}.json`), JSON.stringify(shard)))

  // Предмет без единого источника достаётся только командой. Считаем это
  // ДО того, как интерфейс спрячет самодроп: иначе под нож попали бы блоки,
  // которые честно добываются киркой и ничем больше.
  const itemsWithoutSources = items
    .filter((item) => (pages.get(item.id)?.from.length ?? 0) === 0)
    .map((item) => item.id)
  const commandOnly = new Set(itemsWithoutSources)
  for (const item of items) {
    if (commandOnly.has(item.id)) item.commandOnly = true
  }
  console.log(
    `страниц с источниками: ${pages.size}, только из команд: ${itemsWithoutSources.length}`,
  )

  writeFileSync(join(outDir, 'items.json'), JSON.stringify(items))
  writeFileSync(join(outDir, 'multiblocks.json'), JSON.stringify(multiblocks.data))
  writeFileSync(join(outDir, 'guides.json'), JSON.stringify(guides.data))
  writeFileSync(join(outDir, 'blocks.json'), JSON.stringify(geometry.data))
  writeFileSync(join(outDir, 'entities.json'), JSON.stringify(entityNames))
  writeFileSync(join(outDir, 'villagers.json'), JSON.stringify(trades.catalog))
  const stationRecipes: Record<string, Source[]> = Object.fromEntries(STATIONS.map((id) => [id, []]))
  for (const source of recipes.sources.map(normalizeSource)) {
    const station = stationOf(source)
    if (station) stationRecipes[station]!.push(source)
  }
  writeFileSync(join(outDir, 'stations.json'), JSON.stringify(stationRecipes))
  writeFileSync(join(outDir, 'brewing.json'), JSON.stringify(brewing))
  writeFileSync(join(outDir, 'enchantments.json'), JSON.stringify(enchantments))
  writeFileSync(join(outDir, 'banners.json'), JSON.stringify(banners.data))
  writeFileSync(join(outDir, 'armor-trims.json'), JSON.stringify(armorTrims.data))
  writeFileSync(join(outDir, 'sprites.json'), JSON.stringify(sheet))
  writeFileSync(
    join(outDir, 'meta.json'),
    JSON.stringify({
      version: version.id,
      label: version.label,
      dataDrivenTrades: version.dataDrivenTrades,
      shards: SHARD_COUNT,
      tiles,
    }),
  )

  const revision = writeOfflineManifest(outDir)
  publishedVersions.push({ id: version.id, label: version.label, revision })

  reports.push({
    version: version.id,
    items: items.length,
    icons: { rendered: Object.keys(sheet.index).length, approx: sheet.approx.length, missing: misses.length },
    recipes: {
      read: recipes.fileCount,
      published: recipes.sources.length,
      intentionallySkipped: Object.values(recipes.unsupported).reduce((sum, count) => sum + count, 0),
      unsupported: recipes.unsupported,
    },
    loot: { tables: loot.tableCount, sources: loot.sources.length, unknown: loot.unknown },
    trades: trades.sources.length,
    dataDrivenTrades: version.dataDrivenTrades,
    itemsWithoutSources,
  })

  console.log(`готово за ${((Date.now() - started) / 1000).toFixed(1)} с`)
}

writeFileSync(
  join(OUT_ROOT, 'versions.json'),
  JSON.stringify({
    default: targets.some((version) => version.id === DEFAULT_VERSION) ? DEFAULT_VERSION : targets[0]!.id,
    versions: publishedVersions,
  }),
)
writeFileSync(join(OUT_ROOT, 'coverage.json'), JSON.stringify(reports, null, 2))
publishData()
console.log('\nversions.json и coverage.json записаны, набор данных опубликован атомарно.')

function publishData(): void {
  const backup = `public/.data-backup-${process.pid}`
  if (existsSync(backup)) rmSync(backup, { recursive: true, force: true })
  if (existsSync(FINAL_OUT_ROOT)) renameSync(FINAL_OUT_ROOT, backup)
  try {
    renameSync(OUT_ROOT, FINAL_OUT_ROOT)
    rmSync(backup, { recursive: true, force: true })
  } catch (error) {
    if (existsSync(backup) && !existsSync(FINAL_OUT_ROOT)) renameSync(backup, FINAL_OUT_ROOT)
    throw error
  }
}

/**
 * Манифест — единственный источник списка обязательных файлов офлайн-пакета.
 * Ревизия зависит от содержимого, поэтому обновление гайдов внутри той же
 * версии Minecraft получает новый cache key и не смешивается со старым набором.
 */
function writeOfflineManifest(outDir: string): string {
  const files: { path: string; size: number; sha256: string }[] = []
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name)
      const stat = statSync(absolute)
      if (stat.isDirectory()) {
        walk(absolute)
        continue
      }
      const contents = readFileSync(absolute)
      files.push({
        path: relative(outDir, absolute).split(sep).join('/'),
        size: contents.byteLength,
        sha256: createHash('sha256').update(contents).digest('hex'),
      })
    }
  }
  walk(outDir)
  const revision = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16)
  writeFileSync(join(outDir, 'offline.json'), JSON.stringify({ revision, files }))
  return revision
}

function stationOf(source: Source): string | null {
  if (source.kind === 'craft' || source.kind === 'transmute') return 'crafting_table'
  if (source.kind === 'cook') return source.station
  if (source.kind === 'stonecut') return 'stonecutter'
  if (source.kind === 'smith') return 'smithing_table'
  if (source.kind === 'dynamic') {
    if (source.recipeType.includes('map')) return 'cartography_table'
    return 'crafting_table'
  }
  return null
}
