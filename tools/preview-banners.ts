/**
 * Контрольный лист баннеров для проверки глазами.
 * Запуск: npx tsx tools/preview-banners.ts [id дизайна …]
 *
 * Курируемые дизайны нельзя принимать на веру: узор может лечь не так, как
 * задумано, или цвета сольются. В набор идёт только то, что читается на картинке.
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { loadAtlas } from './mc/atlas.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DEFAULT_VERSION } from './config.ts'
import { DYE_COLORS } from './curated/banner-colors.ts'
import { BANNER_DESIGNS, type BannerDesign } from './curated/banners.ts'

const FACE = { x: 1, y: 1, width: 20, height: 40 }
const SCALE = 4
const PAD = 8
const LABEL_HEIGHT = 14

const version = process.env.MC_VERSION ?? DEFAULT_VERSION
const wanted = process.argv.slice(2).filter((argument) => !argument.startsWith('-'))
/** С флагом --patterns рисуется каталог всех узоров, а не готовые дизайны. */
const patternMode = process.argv.includes('--patterns')

const designs: BannerDesign[] = patternMode
  ? listPatterns()
  : wanted.length > 0
    ? BANNER_DESIGNS.filter((d) => wanted.includes(d.id))
    : BANNER_DESIGNS

function listPatterns(): BannerDesign[] {
  const dir = join(sourceDir(version, 'data-json'), 'data', 'minecraft', 'banner_pattern')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -'.json'.length))
    .sort()
    .map((pattern) => ({
      id: pattern,
      ru: pattern,
      en: pattern,
      base: 'white',
      layers: pattern === 'base' ? [] : [{ pattern, color: 'black' }],
    }))
}

if (designs.length === 0) {
  console.error('Не найдено ни одного дизайна с такими id.')
  process.exit(1)
}

const atlas = await loadAtlas(sourceDir(version, 'atlas'))

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/** Рисует один баннер в RGBA-буфер размером (20×SCALE)×(40×SCALE). */
function renderBanner(design: BannerDesign): Buffer {
  const width = FACE.width * SCALE
  const height = FACE.height * SCALE
  const out = Buffer.alloc(width * height * 4)

  const layers = [{ pattern: 'base', color: design.base }, ...design.layers]

  for (const layer of layers) {
    const rect = atlas.sprites[`entity/banner/${layer.pattern}`]
    if (!rect) {
      console.warn(`  нет текстуры узора ${layer.pattern}`)
      continue
    }
    const [sx, sy] = rect
    const [r, g, b] = rgb(DYE_COLORS[layer.color] ?? '#ff00ff')

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tx = sx + FACE.x + Math.floor(x / SCALE)
        const ty = sy + FACE.y + Math.floor(y / SCALE)
        const source = (ty * atlas.width + tx) * 4
        const alpha = (atlas.data[source + 3] ?? 0) / 255
        if (alpha === 0) continue

        // Маска умножается на цвет красителя, слои кладутся друг на друга.
        const shade = (atlas.data[source] ?? 255) / 255
        const target = (y * width + x) * 4
        out[target] = Math.round(r * shade * alpha + out[target]! * (1 - alpha))
        out[target + 1] = Math.round(g * shade * alpha + out[target + 1]! * (1 - alpha))
        out[target + 2] = Math.round(b * shade * alpha + out[target + 2]! * (1 - alpha))
        out[target + 3] = Math.round(255 * alpha + out[target + 3]! * (1 - alpha))
      }
    }
  }

  return out
}

const tileW = FACE.width * SCALE
const tileH = FACE.height * SCALE
const cellW = tileW + PAD * 2
const cellH = tileH + PAD * 2 + LABEL_HEIGHT
const cols = Math.min(patternMode ? 11 : 7, designs.length)
const rows = Math.ceil(designs.length / cols)

const sheetW = cols * cellW
const sheetH = rows * cellH
const sheet = Buffer.alloc(sheetW * sheetH * 4)
// Светлая подложка: белые узоры на прозрачном фоне иначе не видно.
for (let i = 0; i < sheetW * sheetH; i++) {
  sheet[i * 4] = 60
  sheet[i * 4 + 1] = 62
  sheet[i * 4 + 2] = 68
  sheet[i * 4 + 3] = 255
}

designs.forEach((design, index) => {
  const banner = renderBanner(design)
  const cx = (index % cols) * cellW + PAD
  const cy = Math.floor(index / cols) * cellH + PAD

  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const source = (y * tileW + x) * 4
      const alpha = banner[source + 3]! / 255
      if (alpha === 0) continue
      const target = ((cy + y) * sheetW + cx + x) * 4
      for (let channel = 0; channel < 3; channel++) {
        sheet[target + channel] = Math.round(
          banner[source + channel]! * alpha + sheet[target + channel]! * (1 - alpha),
        )
      }
    }
  }
})

const out = process.env.PREVIEW_OUT ?? 'banners-preview.png'
const png = await sharp(sheet, { raw: { width: sheetW, height: sheetH, channels: 4 } })
  .png()
  .toBuffer()
writeFileSync(out, png)

console.log(`записано: ${out}`)
console.log(designs.map((design, i) => `${i + 1}. ${design.id} — ${design.ru}`).join('\n'))
