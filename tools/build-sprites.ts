/**
 * Рендерит иконки всех предметов версии и упаковывает их в один атлас.
 *
 * Атлас именуется по хешу содержимого, поэтому одинаковые между версиями
 * наборы иконок физически лежат в одном файле и кэшируются браузером один раз.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { AssetSource } from './mc/models.ts'
import { loadAtlas } from './mc/atlas.ts'
import { renderIcon } from './mc/render.ts'
import { bannerIconFor, isMiss, planIcon, type IconMiss } from './mc/icons.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DYE_COLORS } from './curated/banner-colors.ts'

/** Сторона иконки в пикселях: 4× ванильного слота, хватает на retina. */
export const ICON_SIZE = 64

export interface SpriteSheet {
  /** Имя файла атласа с хешем в названии. */
  file: string
  size: number
  cols: number
  /** id предмета → порядковый номер клетки. */
  index: Record<string, number>
  /** Предметы с приблизительной геометрией (рисуются движком игры). */
  approx: string[]
}

export async function buildSprites(version: string, outDir: string): Promise<{ sheet: SpriteSheet; misses: IconMiss[] }> {
  const src = new AssetSource(`${sourceDir(version, 'assets-json')}/assets/minecraft`)
  const atlas = await loadAtlas(sourceDir(version, 'atlas'))

  const items = src.listItems().filter((id) => id !== 'air')
  const rendered: { id: string; data: Buffer; approx: boolean }[] = []
  const misses: IconMiss[] = []

  for (const id of items) {
    // Баннеры собираем из маски флага: обычный путь дал бы доски вместо баннера.
    const bannerColor = bannerIconFor(id, DYE_COLORS)
    if (bannerColor) {
      const banner = renderBannerIcon(atlas, DYE_COLORS[bannerColor]!)
      if (banner) {
        rendered.push({ id, data: banner, approx: false })
        continue
      }
    }

    const plan = planIcon(src, id)
    if (isMiss(plan)) {
      misses.push(plan)
      continue
    }
    const result = renderIcon(plan.model, atlas, ICON_SIZE, plan.tints)
    if (!result) {
      misses.push({ itemId: id, reason: 'нет-геометрии' })
      continue
    }
    rendered.push({ id, data: result.data, approx: plan.approx })
  }

  const cols = Math.ceil(Math.sqrt(rendered.length))
  const rows = Math.ceil(rendered.length / cols)
  const sheetW = cols * ICON_SIZE
  const sheetH = rows * ICON_SIZE
  const sheet = Buffer.alloc(sheetW * sheetH * 4)

  const index: Record<string, number> = {}
  rendered.forEach((icon, i) => {
    index[icon.id] = i
    const cx = (i % cols) * ICON_SIZE
    const cy = Math.floor(i / cols) * ICON_SIZE
    for (let y = 0; y < ICON_SIZE; y++) {
      icon.data.copy(sheet, ((cy + y) * sheetW + cx) * 4, y * ICON_SIZE * 4, (y + 1) * ICON_SIZE * 4)
    }
  })

  // Пиксель-арт: только lossless, иначе появятся артефакты на резких границах.
  const webp = await sharp(sheet, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer()

  const hash = createHash('sha256').update(webp).digest('hex').slice(0, 12)
  const file = `sprites-${hash}.webp`
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, file), webp)

  return {
    sheet: {
      file,
      size: ICON_SIZE,
      cols,
      index,
      approx: rendered.filter((r) => r.approx).map((r) => r.id),
    },
    misses,
  }
}


/** Лицевая сторона флага в текстуре 64×64 — та же область, что в build-banners. */
const BANNER_FACE = { x: 1, y: 1, width: 20, height: 40 }

/**
 * Рисует иконку баннера: маску флага, залитую цветом красителя,
 * вписанную по высоте в квадрат иконки.
 */
function renderBannerIcon(atlas: Awaited<ReturnType<typeof loadAtlas>>, hex: string): Buffer | null {
  const rect = atlas.sprites['entity/banner/base']
  if (!rect) return null
  const [sx, sy] = rect

  const value = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]

  const out = Buffer.alloc(ICON_SIZE * ICON_SIZE * 4)
  // Флаг вдвое выше своей ширины: вписываем по высоте и центрируем.
  const drawH = ICON_SIZE
  const drawW = Math.round((ICON_SIZE * BANNER_FACE.width) / BANNER_FACE.height)
  const offsetX = Math.floor((ICON_SIZE - drawW) / 2)

  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const tx = sx + BANNER_FACE.x + Math.floor((x * BANNER_FACE.width) / drawW)
      const ty = sy + BANNER_FACE.y + Math.floor((y * BANNER_FACE.height) / drawH)
      const source = (ty * atlas.width + tx) * 4
      const alpha = atlas.data[source + 3] ?? 0
      if (alpha === 0) continue

      // Оттенок ткани из маски умножаем на цвет красителя — как делает игра.
      const shade = (atlas.data[source] ?? 255) / 255
      const target = (y * ICON_SIZE + x + offsetX) * 4
      out[target] = Math.round(r * shade)
      out[target + 1] = Math.round(g * shade)
      out[target + 2] = Math.round(b * shade)
      out[target + 3] = alpha
    }
  }

  return out
}
