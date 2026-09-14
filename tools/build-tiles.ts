/**
 * Фоновые плитки из текстур игры.
 *
 * Фон меню Minecraft — это тайл блока с затемнением. Берём две текстуры из
 * атласа (камень для светлой темы, глубинный сланец для тёмной), увеличиваем
 * до пиксель-в-пиксель и кладём рядом со спрайтами.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { loadAtlas } from './mc/atlas.ts'
import { sourceDir } from './fetch-mcmeta.ts'

/** Во сколько раз увеличить 16×16 текстуру. */
const SCALE = 4

const TILES: Record<string, string[]> = {
  // Первая найденная текстура из списка — на случай, если в версии её нет.
  // Обе темы на одной текстуре: различает их только плотность вуали.
  'tile-light.png': ['block/spruce_planks', 'block/oak_planks'],
  'tile-dark.png': ['block/spruce_planks', 'block/oak_planks'],
}

export interface TileSet {
  light: string
  dark: string
  /** Лента кадров огня и их количество — для CSS-анимации печи. */
  flame: string
  flameFrames: number
}

export async function buildTiles(version: string, outDir: string): Promise<TileSet> {
  const atlas = await loadAtlas(sourceDir(version, 'atlas'))
  mkdirSync(outDir, { recursive: true })

  const flame = await writeFlame(atlas, outDir)

  for (const [file, candidates] of Object.entries(TILES)) {
    const name = candidates.find((candidate) => atlas.sprites[candidate])
    if (!name) throw new Error(`ни одной текстуры для ${file} нет в атласе версии ${version}`)

    const [sx, sy, w, h] = atlas.sprites[name]!
    const size = Math.min(w, h)
    const out = Buffer.alloc(size * SCALE * size * SCALE * 4)

    for (let y = 0; y < size * SCALE; y++) {
      for (let x = 0; x < size * SCALE; x++) {
        const source = ((sy + Math.floor(y / SCALE)) * atlas.width + sx + Math.floor(x / SCALE)) * 4
        const target = (y * size * SCALE + x) * 4
        for (let channel = 0; channel < 4; channel++) {
          out[target + channel] = atlas.data[source + channel] ?? 0
        }
      }
    }

    const png = await sharp(out, { raw: { width: size * SCALE, height: size * SCALE, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    writeFileSync(join(outDir, file), png)
  }

  return { light: 'tile-light.png', dark: 'tile-dark.png', flame: flame.file, flameFrames: flame.frames }
}

/**
 * Текстура огня в игре анимированная: это вертикальная лента кадров 16×16.
 * Сохраняем её как есть — CSS проиграет кадры через steps(), без единой
 * дополнительной картинки и без JavaScript.
 */
async function writeFlame(
  atlas: Awaited<ReturnType<typeof loadAtlas>>,
  outDir: string,
): Promise<{ file: string; frames: number }> {
  const rect = atlas.sprites['block/fire_1'] ?? atlas.sprites['block/fire_0']
  if (!rect) throw new Error('в атласе нет текстуры огня')

  const [sx, sy, w, h] = rect
  const frames = Math.max(1, Math.round(h / w))
  const outW = w * SCALE
  const outH = h * SCALE
  const out = Buffer.alloc(outW * outH * 4)

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const source = ((sy + Math.floor(y / SCALE)) * atlas.width + sx + Math.floor(x / SCALE)) * 4
      const target = (y * outW + x) * 4
      for (let channel = 0; channel < 4; channel++) {
        out[target + channel] = atlas.data[source + channel] ?? 0
      }
    }
  }

  const png = await sharp(out, { raw: { width: outW, height: outH, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const file = 'flame.png'
  writeFileSync(join(outDir, file), png)
  return { file, frames }
}
