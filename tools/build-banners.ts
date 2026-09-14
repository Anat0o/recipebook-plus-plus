/**
 * Данные ткацкого станка: узоры баннеров, их образцы и готовые дизайны.
 *
 * Маски узоров вырезаются из атласа в одну вертикальную ленту, а красит их уже
 * браузер через CSS-маску. Так один файл на 10 КБ заменяет десятки готовых
 * картинок, любой цвет доступен без пересборки, и каждый слой остаётся
 * отдельным элементом — послойная анимация сборки получается сама собой.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { loadAtlas } from './mc/atlas.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { LOCALES } from './config.ts'
import { COLOR_ORDER, DYE_COLORS } from './curated/banner-colors.ts'
import { BANNER_DESIGNS, MAX_LAYERS, type BannerDesign } from './curated/banners.ts'

/** Лицевая сторона флага в текстуре 64×64 — проверено по альфа-каналу. */
const FACE = { x: 1, y: 1, width: 20, height: 40 }
/** Во сколько раз увеличиваем маску: 20×40 → 80×160. */
const SCALE = 4

export interface BannerPattern {
  id: string
  /** Название по цветам: цвет → код языка → строка. */
  names: Record<string, Record<string, string>>
  /** Предмет-образец, если узор без него не нанести. */
  patternItem?: string
  /** Позиция маски в ленте. */
  index: number
}

export interface BannerData {
  /** Файл ленты масок. */
  file: string
  /** Размер одной маски в пикселях. */
  width: number
  height: number
  colors: Record<string, string>
  colorOrder: string[]
  patterns: BannerPattern[]
  designs: BannerDesign[]
  maxLayers: number
}

export async function buildBanners(
  version: string,
  dataRoot: string,
  knownItems: Set<string>,
  outDir: string,
): Promise<{ data: BannerData; problems: string[] }> {
  const problems: string[] = []

  const patternDir = join(dataRoot, 'banner_pattern')
  if (!existsSync(patternDir)) {
    return {
      data: {
        file: '', width: FACE.width * SCALE, height: FACE.height * SCALE,
        colors: DYE_COLORS, colorOrder: COLOR_ORDER, patterns: [], designs: [], maxLayers: MAX_LAYERS,
      },
      problems: ['в этой версии нет data/minecraft/banner_pattern'],
    }
  }

  const patternIds = readdirSync(patternDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .sort()

  // Имя файла тега — это имя предмета-образца, а его содержимое — узоры,
  // которые образец даёт. Совпадают они не всегда: field_masoned_banner_pattern
  // выдаёт узор bricks, поэтому связь только читается, а не угадывается по имени.
  const patternItemByPattern = new Map<string, string>()
  const patternItemDir = join(dataRoot, 'tags', 'banner_pattern', 'pattern_item')
  if (existsSync(patternItemDir)) {
    for (const file of readdirSync(patternItemDir)) {
      if (!file.endsWith('.json')) continue
      const itemId = `${file.slice(0, -'.json'.length)}_banner_pattern`
      if (!knownItems.has(itemId)) {
        problems.push(`образец ${itemId} есть в тегах, но не в реестре предметов`)
        continue
      }
      const values: string[] = JSON.parse(readFileSync(join(patternItemDir, file), 'utf8')).values ?? []
      for (const value of values) patternItemByPattern.set(strip(value), itemId)
    }
  }

  const lang: Record<string, Record<string, string>> = {}
  const langDir = join(sourceDir(version, 'assets-json'), 'assets', 'minecraft', 'lang')
  for (const [mcCode, siteCode] of Object.entries(LOCALES)) {
    lang[siteCode] = JSON.parse(readFileSync(join(langDir, `${mcCode}.json`), 'utf8'))
  }

  const patterns: BannerPattern[] = patternIds.map((id, index) => {
    const names: Record<string, Record<string, string>> = {}
    for (const color of COLOR_ORDER) {
      for (const [siteCode, dict] of Object.entries(lang)) {
        const name = dict[`block.minecraft.banner.${id}.${color}`]
        if (name) (names[color] ??= {})[siteCode] = name
      }
    }
    if (Object.keys(names).length !== COLOR_ORDER.length) {
      problems.push(`у узора ${id} нет названий для всех цветов`)
    }
    const patternItem = patternItemByPattern.get(id)
    return patternItem ? { id, names, patternItem, index } : { id, names, index }
  })

  const file = await writeMaskStrip(version, patternIds, outDir)

  // Дизайн, который ссылается на несуществующий узор, показывать нельзя.
  const available = new Set(patternIds)
  const designs = BANNER_DESIGNS.filter((design) => {
    if (design.layers.length > MAX_LAYERS) {
      problems.push(`дизайн ${design.id}: слоёв больше ${MAX_LAYERS}`)
      return false
    }
    const missing = design.layers.map((layer) => layer.pattern).filter((pattern) => !available.has(pattern))
    if (missing.length > 0) {
      problems.push(`дизайн ${design.id}: в версии нет узоров ${missing.join(', ')}`)
      return false
    }
    const badColors = [design.base, ...design.layers.map((layer) => layer.color)].filter(
      (color) => !(color in DYE_COLORS),
    )
    if (badColors.length > 0) {
      problems.push(`дизайн ${design.id}: неизвестные цвета ${badColors.join(', ')}`)
      return false
    }
    return true
  })

  return {
    data: {
      file,
      width: FACE.width * SCALE,
      height: FACE.height * SCALE,
      colors: DYE_COLORS,
      colorOrder: COLOR_ORDER,
      patterns,
      designs,
      maxLayers: MAX_LAYERS,
    },
    problems,
  }
}

/**
 * Собирает маски всех узоров в одну вертикальную ленту.
 * В маске важен только альфа-канал: цвет добавит браузер.
 */
async function writeMaskStrip(version: string, patternIds: string[], outDir: string): Promise<string> {
  const atlas = await loadAtlas(sourceDir(version, 'atlas'))
  const tileW = FACE.width * SCALE
  const tileH = FACE.height * SCALE
  const strip = Buffer.alloc(tileW * tileH * patternIds.length * 4)

  patternIds.forEach((id, index) => {
    const rect = atlas.sprites[`entity/banner/${id}`]
    if (!rect) return
    const [sx, sy] = rect
    const top = index * tileH

    for (let y = 0; y < tileH; y++) {
      for (let x = 0; x < tileW; x++) {
        const tx = sx + FACE.x + Math.floor(x / SCALE)
        const ty = sy + FACE.y + Math.floor(y / SCALE)
        const alpha = atlas.data[(ty * atlas.width + tx) * 4 + 3] ?? 0
        const out = ((top + y) * tileW + x) * 4
        // Белый с исходной прозрачностью: маску красит CSS.
        strip[out] = 255
        strip[out + 1] = 255
        strip[out + 2] = 255
        strip[out + 3] = alpha
      }
    }
  })

  const png = await sharp(strip, {
    raw: { width: tileW, height: tileH * patternIds.length, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

  mkdirSync(outDir, { recursive: true })
  const file = 'banner-masks.png'
  writeFileSync(join(outDir, file), png)
  return file
}

function strip(id: string): string {
  return id.replace(/^minecraft:/, '')
}
