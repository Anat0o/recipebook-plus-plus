/**
 * Галерея кузнечного стола: полные надетые комплекты брони с отделкой.
 *
 * Базовая броня, маска узора и цветовая палитра берутся из официального
 * client JAR каждой версии. Из них собирается компактный атлас фронтальных
 * пиксельных манекенов — браузеру остаётся выбрать готовую ячейку.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { LOCALES } from './config.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { officialArmorAssets } from './mc/official-client.ts'

const TILE_WIDTH = 32
const TILE_HEIGHT = 64
const SCALE = 2
const COLS = 42

const ARMOR = [
  { id: 'leather', itemPrefix: 'leather', asset: 'leather' },
  { id: 'chainmail', itemPrefix: 'chainmail', asset: 'chainmail' },
  { id: 'copper', itemPrefix: 'copper', asset: 'copper' },
  { id: 'iron', itemPrefix: 'iron', asset: 'iron' },
  { id: 'gold', itemPrefix: 'golden', asset: 'gold' },
  { id: 'diamond', itemPrefix: 'diamond', asset: 'diamond' },
  { id: 'netherite', itemPrefix: 'netherite', asset: 'netherite' },
] as const

const MATERIAL_ITEMS: Record<string, string> = {
  amethyst: 'amethyst_shard',
  copper: 'copper_ingot',
  diamond: 'diamond',
  emerald: 'emerald',
  gold: 'gold_ingot',
  iron: 'iron_ingot',
  lapis: 'lapis_lazuli',
  netherite: 'netherite_ingot',
  quartz: 'quartz',
  redstone: 'redstone',
  resin: 'resin_brick',
}

interface RawImage {
  data: Buffer
  width: number
  height: number
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
  /** `pattern/material/armor` → номер ячейки атласа. */
  index: Record<string, number>
}

async function raw(file: string): Promise<RawImage> {
  const result = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: result.data, width: result.info.width, height: result.info.height }
}

function pixel(image: RawImage, x: number, y: number): [number, number, number, number] {
  const at = (y * image.width + x) * 4
  return [image.data[at]!, image.data[at + 1]!, image.data[at + 2]!, image.data[at + 3]!]
}

function blend(target: Buffer, at: number, color: [number, number, number, number]): void {
  const alpha = color[3] / 255
  if (alpha <= 0) return
  const oldAlpha = target[at + 3]! / 255
  const outAlpha = alpha + oldAlpha * (1 - alpha)
  for (let channel = 0; channel < 3; channel += 1) {
    target[at + channel] = Math.round(
      (color[channel]! * alpha + target[at + channel]! * oldAlpha * (1 - alpha)) / outAlpha,
    )
  }
  target[at + 3] = Math.round(outAlpha * 255)
}

function rectangle(target: Buffer, x: number, y: number, width: number, height: number): void {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      blend(target, (py * TILE_WIDTH + px) * 4, [54, 49, 47, 255])
    }
  }
}

function mannequin(): Buffer {
  const target = Buffer.alloc(TILE_WIDTH * TILE_HEIGHT * 4)
  rectangle(target, 8, 0, 16, 16)
  rectangle(target, 8, 16, 16, 24)
  rectangle(target, 0, 16, 8, 24)
  rectangle(target, 24, 16, 8, 24)
  rectangle(target, 8, 40, 16, 24)
  return target
}

function drawRegion(
  target: Buffer,
  image: RawImage,
  source: { x: number; y: number; width: number; height: number },
  destination: { x: number; y: number },
  mirror = false,
): void {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sx = source.x + (mirror ? source.width - x - 1 : x)
      const color = pixel(image, sx, source.y + y)
      for (let yy = 0; yy < SCALE; yy += 1) {
        for (let xx = 0; xx < SCALE; xx += 1) {
          const dx = destination.x + x * SCALE + xx
          const dy = destination.y + y * SCALE + yy
          blend(target, (dy * TILE_WIDTH + dx) * 4, color)
        }
      }
    }
  }
}

/** Раскладывает фронтальные UV модели игрока в читаемый силуэт полного сета. */
function drawWearable(target: Buffer, humanoid: RawImage, leggings: RawImage): void {
  const head = { x: 8, y: 8, width: 8, height: 8 }
  const body = { x: 20, y: 20, width: 8, height: 12 }
  const arm = { x: 44, y: 20, width: 4, height: 12 }
  const leg = { x: 4, y: 20, width: 4, height: 12 }
  drawRegion(target, humanoid, head, { x: 8, y: 0 })
  drawRegion(target, humanoid, body, { x: 8, y: 16 })
  drawRegion(target, leggings, body, { x: 8, y: 16 })
  drawRegion(target, humanoid, arm, { x: 0, y: 16 }, true)
  drawRegion(target, humanoid, arm, { x: 24, y: 16 })
  drawRegion(target, humanoid, leg, { x: 8, y: 40 }, true)
  drawRegion(target, leggings, leg, { x: 8, y: 40 }, true)
  drawRegion(target, humanoid, leg, { x: 16, y: 40 })
  drawRegion(target, leggings, leg, { x: 16, y: 40 })
}

function tinted(image: RawImage, color: string): RawImage {
  const tint = color.replace('#', '').match(/../g)?.map((part) => Number.parseInt(part, 16)) ?? [255, 255, 255]
  const data = Buffer.from(image.data)
  for (let at = 0; at < data.length; at += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      data[at + channel] = Math.round(data[at + channel]! * tint[channel]! / 255)
    }
  }
  return { ...image, data }
}

function recolor(mask: RawImage, source: RawImage, target: RawImage): RawImage {
  const from = Array.from({ length: source.width }, (_, x) => pixel(source, x, 0))
  const to = Array.from({ length: target.width }, (_, x) => pixel(target, x, 0))
  const data = Buffer.alloc(mask.data.length)
  for (let at = 0; at < mask.data.length; at += 4) {
    const alpha = mask.data[at + 3]!
    if (!alpha) continue
    const value = mask.data[at]!
    let best = 0
    for (let index = 1; index < from.length; index += 1) {
      if (Math.abs(from[index]![0] - value) < Math.abs(from[best]![0] - value)) best = index
    }
    data[at] = to[best]![0]
    data[at + 1] = to[best]![1]
    data[at + 2] = to[best]![2]
    data[at + 3] = Math.round(alpha * to[best]![3] / 255)
  }
  return { ...mask, data }
}

export async function buildArmorTrims(
  version: string,
  dataRoot: string,
  knownItems: Set<string>,
  outDir: string,
): Promise<{ data: ArmorTrimData; problems: string[] }> {
  const problems: string[] = []
  const assets = await officialArmorAssets(version)
  const texture = (...parts: string[]): string => join(assets, 'textures', ...parts)
  const langDir = join(sourceDir(version, 'assets-json'), 'assets', 'minecraft', 'lang')
  const dictionaries = Object.fromEntries(Object.entries(LOCALES).map(([source, target]) => [
    target,
    JSON.parse(readFileSync(join(langDir, `${source}.json`), 'utf8')) as Record<string, string>,
  ]))
  const names = (key: string): Record<string, string> => Object.fromEntries(
    Object.entries(dictionaries).map(([code, dictionary]) => [code, dictionary[key] ?? key]),
  )

  const armor = ARMOR.filter(({ itemPrefix }) =>
    ['helmet', 'chestplate', 'leggings', 'boots'].every((part) => knownItems.has(`${itemPrefix}_${part}`)),
  ).map((entry) => ({
    ...entry,
    chestplate: `${entry.itemPrefix}_chestplate`,
    names: names(`item.minecraft.${entry.itemPrefix}_chestplate`),
  }))

  const patterns = readdirSync(join(dataRoot, 'trim_pattern')).filter((file) => file.endsWith('.json'))
    .map((file) => {
      const id = file.slice(0, -5)
      const json = JSON.parse(readFileSync(join(dataRoot, 'trim_pattern', file), 'utf8'))
      return {
        id,
        names: names(json.description?.translate ?? `trim_pattern.minecraft.${id}`),
        template: `${id}_armor_trim_smithing_template`,
      }
    }).filter((entry) => knownItems.has(entry.template)).sort((a, b) => a.id.localeCompare(b.id))

  const materialJson = new Map<string, any>()
  const materials = readdirSync(join(dataRoot, 'trim_material')).filter((file) => file.endsWith('.json'))
    .map((file) => {
      const id = file.slice(0, -5)
      const json = JSON.parse(readFileSync(join(dataRoot, 'trim_material', file), 'utf8'))
      materialJson.set(id, json)
      return {
        id,
        names: names(json.description?.translate ?? `trim_material.minecraft.${id}`),
        item: MATERIAL_ITEMS[id] ?? id,
        color: json.description?.color ?? '#ffffff',
      }
    }).filter((entry) => knownItems.has(entry.item)).sort((a, b) => a.id.localeCompare(b.id))

  const baseImages = new Map<string, { humanoid: RawImage; leggings: RawImage; overlay?: { humanoid: RawImage; leggings: RawImage } }>()
  for (const entry of armor) {
    const humanoid = await raw(texture('entity', 'equipment', 'humanoid', `${entry.asset}.png`))
    const leggings = await raw(texture('entity', 'equipment', 'humanoid_leggings', `${entry.asset}.png`))
    const overlay = entry.id === 'leather' ? {
      humanoid: await raw(texture('entity', 'equipment', 'humanoid', 'leather_overlay.png')),
      leggings: await raw(texture('entity', 'equipment', 'humanoid_leggings', 'leather_overlay.png')),
    } : undefined
    baseImages.set(entry.id, {
      humanoid: entry.id === 'leather' ? tinted(humanoid, '#a06540') : humanoid,
      leggings: entry.id === 'leather' ? tinted(leggings, '#a06540') : leggings,
      ...(overlay ? { overlay } : {}),
    })
  }

  const sourcePalette = await raw(texture('trims', 'color_palettes', 'trim_palette.png'))
  const palettes = new Map<string, RawImage>()
  const palette = async (id: string): Promise<RawImage> => {
    const cached = palettes.get(id)
    if (cached) return cached
    const loaded = await raw(texture('trims', 'color_palettes', `${id}.png`))
    palettes.set(id, loaded)
    return loaded
  }
  const maskCache = new Map<string, { humanoid: RawImage; leggings: RawImage }>()
  for (const pattern of patterns) {
    maskCache.set(pattern.id, {
      humanoid: await raw(texture('trims', 'entity', 'humanoid', `${pattern.id}.png`)),
      leggings: await raw(texture('trims', 'entity', 'humanoid_leggings', `${pattern.id}.png`)),
    })
  }

  const total = patterns.length * materials.length * armor.length
  const rows = Math.ceil(total / COLS)
  const atlas = Buffer.alloc(COLS * TILE_WIDTH * rows * TILE_HEIGHT * 4)
  const index: Record<string, number> = {}
  let current = 0
  for (const pattern of patterns) {
    const masks = maskCache.get(pattern.id)!
    for (const material of materials) {
      const definition = materialJson.get(material.id)
      for (const armorType of armor) {
        const base = baseImages.get(armorType.id)!
        const paletteId = definition.override_armor_assets?.[`minecraft:${armorType.id}`] ?? definition.asset_name ?? material.id
        const targetPalette = await palette(paletteId)
        const tile = mannequin()
        drawWearable(tile, base.humanoid, base.leggings)
        if (base.overlay) drawWearable(tile, base.overlay.humanoid, base.overlay.leggings)
        drawWearable(tile, recolor(masks.humanoid, sourcePalette, targetPalette), recolor(masks.leggings, sourcePalette, targetPalette))

        const col = current % COLS
        const row = Math.floor(current / COLS)
        for (let y = 0; y < TILE_HEIGHT; y += 1) {
          const from = y * TILE_WIDTH * 4
          const to = ((row * TILE_HEIGHT + y) * COLS * TILE_WIDTH + col * TILE_WIDTH) * 4
          tile.copy(atlas, to, from, from + TILE_WIDTH * 4)
        }
        index[`${pattern.id}/${material.id}/${armorType.id}`] = current
        current += 1
      }
    }
  }

  if (!patterns.length) problems.push('нет доступных узоров отделки')
  if (!materials.length) problems.push('нет доступных материалов отделки')
  if (!armor.some((entry) => entry.id === 'netherite')) problems.push('нет полного незеритового комплекта')

  const file = 'armor-sets.png'
  mkdirSync(outDir, { recursive: true })
  const png = await sharp(atlas, {
    raw: { width: COLS * TILE_WIDTH, height: rows * TILE_HEIGHT, channels: 4 },
  }).png({ compressionLevel: 9, palette: true }).toBuffer()
  writeFileSync(join(outDir, file), png)

  return {
    data: {
      file,
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      cols: COLS,
      defaultArmor: armor.some((entry) => entry.id === 'netherite') ? 'netherite' : armor.at(-1)?.id ?? '',
      defaultMaterial: materials.some((entry) => entry.id === 'gold') ? 'gold' : materials[0]?.id ?? '',
      armor: armor.map(({ id, names: armorNames, chestplate }) => ({ id, names: armorNames, chestplate })),
      patterns,
      materials,
      index,
    },
    problems,
  }
}
