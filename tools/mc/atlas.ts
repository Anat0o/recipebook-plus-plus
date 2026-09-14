/** Загрузка атласа текстур mcmeta (ветка `atlas`) в сырой RGBA. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import type { Atlas } from './render.ts'

export async function loadAtlas(atlasRoot: string, name = 'all'): Promise<Atlas> {
  const dir = join(atlasRoot, name)
  const sprites = JSON.parse(readFileSync(join(dir, 'data.min.json'), 'utf8')) as Atlas['sprites']
  const image = sharp(join(dir, 'atlas.png')).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data, sprites }
}
