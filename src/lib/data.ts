/**
 * Загрузка статических данных версии.
 *
 * Данные разложены по шардам, поэтому страница предмета тянет один небольшой
 * файл, а не весь справочник. Всё, что загружено, кэшируется в памяти.
 */
import type { ItemEntry, ItemPage, VersionMeta } from './schema.ts'
import type { BlockData, Placement, SceneEntity } from './webgl.ts'

export type SceneEvent =
  | { tick: number; type: 'press'; x: number; y: number; z: number }
  | { tick: number; type: 'block'; x: number; y: number; z: number; block?: string; facing?: string; variant?: string }
  | { tick: number; type: 'container'; x: number; y: number; z: number; signal: number }
  | { tick: number; type: 'move'; entity: string; x: number; y: number; z: number }
  | { tick: number; type: 'show'; entity: string; visible: boolean }

export interface AnimationSpec {
  duration: number
  loop?: boolean
  events: SceneEvent[]
}

export interface SpriteSheet {
  file: string
  size: number
  cols: number
  index: Record<string, number>
  approx: string[]
}

export interface VersionList {
  default: string
  versions: { id: string; label: string }[]
}

export type NameMap = Record<string, Record<string, string>>

export interface VersionData {
  meta: VersionMeta
  items: ItemEntry[]
  byId: Map<string, ItemEntry>
  sprites: SpriteSheet
  spriteUrl: string
  entityNames: NameMap
}

const BASE = `${import.meta.env.BASE_URL}data`

const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(path: string): Promise<T> {
  const existing = cache.get(path) as Promise<T> | undefined
  if (existing) return existing
  const promise = fetch(`${BASE}/${path}`).then((response) => {
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`)
    return response.json() as Promise<T>
  }).catch((error) => {
    // Ошибка сети не должна навсегда отравлять кэш: кнопка повтора обязана
    // сделать новый запрос, а не получить тот же rejected Promise.
    cache.delete(path)
    throw error
  })
  cache.set(path, promise)
  return promise
}

export function loadVersionList(): Promise<VersionList> {
  return fetchJson<VersionList>('versions.json')
}

export async function loadVersion(version: string): Promise<VersionData> {
  const [meta, items, sprites, entityNames] = await Promise.all([
    fetchJson<VersionMeta>(`${version}/meta.json`),
    fetchJson<ItemEntry[]>(`${version}/items.json`),
    fetchJson<SpriteSheet>(`${version}/sprites.json`),
    fetchJson<NameMap>(`${version}/entities.json`),
  ])
  return {
    meta,
    items,
    byId: new Map(items.map((item) => [item.id, item])),
    sprites,
    spriteUrl: `${BASE}/${version}/${sprites.file}`,
    entityNames,
  }
}

/** Тот же хеш, что в сборщике, — иначе шард не найдётся. */
function shardOf(itemId: string, shards: number): number {
  let hash = 0
  for (let i = 0; i < itemId.length; i++) hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0
  return hash % shards
}

export async function loadItemPage(version: string, shards: number, itemId: string): Promise<ItemPage | null> {
  const shard = await fetchJson<Record<string, ItemPage>>(`${version}/item/${shardOf(itemId, shards)}.json`)
  return shard[itemId] ?? null
}

export interface BrewStep {
  from: string
  ingredient: string
  to: string
}

export interface BrewingData {
  fuel: string
  water: string
  awkward: string
  potionNames: Record<string, Record<string, string>>
  base: BrewStep[]
  effects: BrewStep[]
  extendable: string[]
  upgradable: string[]
  corruptions: Record<string, string>
  forms: { ingredient: string; from: string; to: string; note: string }[]
  skipped: string[]
}

export interface EnchantmentEntry {
  id: string
  names: Record<string, string>
  maxLevel: number
  weight: number
  anvilCost: number
  items: string[]
  itemsTag?: string
  exclusiveWith: string[]
  minCost: number[]
  treasureOnly: boolean
}

/** Данные станций грузятся лениво — на экране поиска они не нужны. */
export function loadBrewing(version: string): Promise<BrewingData> {
  return fetchJson<BrewingData>(`${version}/brewing.json`)
}

export function loadEnchantments(version: string): Promise<EnchantmentEntry[]> {
  return fetchJson<EnchantmentEntry[]>(`${version}/enchantments.json`)
}

export interface BannerLayer {
  pattern: string
  color: string
}

export interface BannerDesign {
  id: string
  ru: string
  en: string
  base: string
  layers: BannerLayer[]
}

export interface BannerPattern {
  id: string
  /** Название по цветам: цвет → код языка → строка. */
  names: Record<string, Record<string, string>>
  /** Предмет-образец, без которого узор не нанести. */
  patternItem?: string
  /** Позиция маски в ленте. */
  index: number
}

export interface BannerData {
  file: string
  width: number
  height: number
  colors: Record<string, string>
  colorOrder: string[]
  patterns: BannerPattern[]
  designs: BannerDesign[]
  maxLayers: number
}

export interface ArmorTrimData {
  file: string
  width: number
  height: number
  cols: number
  defaultArmor: string
  defaultMaterial: string
  armor: { id: string; names: Record<string, string>; chestplate: string }[]
  patterns: { id: string; names: Record<string, string>; template: string }[]
  materials: { id: string; names: Record<string, string>; item: string; color: string }[]
  index: Record<string, number>
}

/** Данные ткацкого станка вместе с адресом ленты масок. */
export async function loadBanners(version: string): Promise<BannerData & { maskUrl: string }> {
  const data = await fetchJson<BannerData>(`${version}/banners.json`)
  return { ...data, maskUrl: `${BASE}/${version}/${data.file}` }
}

/** Полные комплекты с отделкой и адрес их пиксельного атласа. */
export async function loadArmorTrims(version: string): Promise<ArmorTrimData & { atlasUrl: string }> {
  const data = await fetchJson<ArmorTrimData>(`${version}/armor-trims.json`)
  return { ...data, atlasUrl: `${BASE}/${version}/${data.file}` }
}

export interface MultiblockData {
  id: string
  names: Record<string, string>
  notes: Record<string, string>
  icon: string
  placements: Placement[]
  steps: Record<string, string>[]
  parts: string[]
}

export interface GuideData {
  id: string
  category: 'farm' | 'redstone'
  names: Record<string, string>
  summaries: Record<string, string>
  icon: string
  editions: ('java' | 'bedrock')[]
  materials: { id: string; count: number }[]
  steps: Record<string, string>[]
  builds: {
    names: Record<string, string>
    steps: Record<string, string>[]
    placements: Placement[]
    entities: SceneEntity[]
    animation?: AnimationSpec
  }[]
  notes: Record<string, string[]>
}

export interface TradePoolData {
  id: string
  level?: number
  picks: number
  offers: Extract<import('./schema.ts').Source, { kind: 'trade' }>[]
}

export interface VillagerProfileData {
  id: string
  names: Record<string, string>
  workstation?: string
  variants: string[]
  pools: TradePoolData[]
}

export interface VillagerCatalogData {
  version: string
  profiles: VillagerProfileData[]
}

export async function loadMultiblocks(version: string): Promise<MultiblockData[]> {
  return fetchJson<MultiblockData[]>(`${version}/multiblocks.json`)
}

export async function loadGuides(version: string): Promise<GuideData[]> {
  return fetchJson<GuideData[]>(`${version}/guides.json`)
}

export function loadVillagers(version: string): Promise<VillagerCatalogData> {
  return fetchJson<VillagerCatalogData>(`${version}/villagers.json`)
}

export function loadStations(version: string): Promise<Record<string, import('./schema.ts').Source[]>> {
  return fetchJson<Record<string, import('./schema.ts').Source[]>>(`${version}/stations.json`)
}

export type { Placement } from './webgl.ts'

/** Геометрия блоков вместе с адресом атласа текстур. */
export async function loadBlocks(version: string): Promise<BlockData & { url: string }> {
  const data = await fetchJson<BlockData>(`${version}/blocks.json`)
  return { ...data, url: `${BASE}/${version}/${data.file}` }
}

/** Все файлы версии — список для оффлайн-загрузки. */
export function versionFiles(
  version: string,
  meta: { shards: number; tiles: { light: string; dark: string; flame: string } },
  spriteFile: string,
): string[] {
  const base = `${BASE}/${version}`
  return [
    // Без списка версий приложение не стартует вовсе — он идёт первым.
    `${BASE}/versions.json`,
    `${base}/meta.json`,
    `${base}/items.json`,
    `${base}/entities.json`,
    `${base}/brewing.json`,
    `${base}/enchantments.json`,
    `${base}/banners.json`,
    `${base}/armor-trims.json`,
    `${base}/multiblocks.json`,
    `${base}/guides.json`,
    `${base}/villagers.json`,
    `${base}/stations.json`,
    `${base}/blocks.json`,
    `${base}/blocks.png`,
    `${base}/sprites.json`,
    `${base}/${spriteFile}`,
    `${base}/banner-masks.png`,
    `${base}/armor-sets.png`,
    `${base}/${meta.tiles.light}`,
    `${base}/${meta.tiles.dark}`,
    `${base}/${meta.tiles.flame}`,
    ...Array.from({ length: meta.shards }, (_, i) => `${base}/item/${i}.json`),
  ]
}
