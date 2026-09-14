/**
 * Геометрия блоков для 3D-схем.
 *
 * Модели разбираются здесь, а не в браузере: цепочки `parent`, UV и повороты
 * элементов — это работа, которую нет смысла делать на телефоне 35 раз.
 * Наружу уходит готовый список граней и атлас только из нужных текстур.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { AssetSource, type ResolvedModel } from './mc/models.ts'
import { BlockStates } from './mc/blockstates.ts'
import { buildQuads, placeQuads, type Quad } from './mc/quads.ts'
import { loadAtlas } from './mc/atlas.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { SPECIAL_MODELS } from './curated/icon-overrides.ts'
import {
  BLOCK_MODELS, BLOCK_MODEL_FALLBACKS, BLOCK_STATES, BLOCK_TINTS, DEFAULT_STATE,
  gameFacing, SYNTHETIC_FALLBACKS, SYNTHETIC_MODELS, TRANSLUCENT, variantProperties,
  WALL_FORMS,
} from './curated/block-models.ts'

/** Сторона одной коробки, готовая к отправке в браузер. */
export interface BlockFace {
  /** Четыре угла в пространстве блока 0…16. */
  pos: number[]
  /** Четыре пары UV в пикселях текстуры 0…16. */
  uv: number[]
  /** Номер текстуры в атласе блоков. */
  tex: number
  /** Яркость грани, 0…1. */
  shade: number
  /** Цвет тонировки, если грань его требует. */
  tint?: number
  /** Сторона блока, к которой грань прилегает: по ней прячут внутренние грани. */
  cull?: string
}

export interface BlockMesh {
  /** Ключ вида `hopper^east`: блок вместе с направлением. */
  id: string
  faces: BlockFace[]
  translucent?: boolean
}

export interface BlockData {
  /** Файл атласа текстур блоков. */
  file: string
  /** Размер одной текстуры в пикселях. */
  tile: number
  /** Сколько текстур в ряду. */
  cols: number
  atlasWidth: number
  atlasHeight: number
  /**
   * Номер сплошной белой плитки в атласе.
   * По ней рисуют опору вида: цвет тогда задаётся вершинами, а не текстурой.
   */
  whiteTile: number
  entityTextures: Record<string, number>
  blocks: BlockMesh[]
}

/** Во сколько раз увеличиваем текстуры в атласе: 16 → 64. */
const SCALE = 4
const TILE = 16 * SCALE

/** Текстуры для лёгких кубоидных моделей внутри схем. */
const ENTITY_TEXTURE_SPRITES: Record<string, string> = {
  villager: 'entity/villager/villager',
  zombie: 'entity/zombie/zombie',
  iron_golem: 'entity/iron_golem/iron_golem',
  chicken: 'entity/chicken/chicken_temperate',
  bee: 'entity/bee/bee',
  cat: 'entity/cat/tabby',
  creeper: 'entity/creeper/creeper',
  skeleton: 'entity/skeleton/skeleton',
  spider: 'entity/spider/spider',
  blaze: 'entity/blaze/blaze',
  hopper_minecart: 'entity/minecart',
}

export async function buildBlocks(
  version: string,
  ids: string[],
  outDir: string,
): Promise<{ data: BlockData; problems: string[] }> {
  const problems: string[] = []
  const assets = join(sourceDir(version, 'assets-json'), 'assets', 'minecraft')
  const src = new AssetSource(assets)
  const states = new BlockStates(assets)
  const atlas = await loadAtlas(sourceDir(version, 'atlas'))

  // Каждая текстура попадает в атлас один раз, номер — её место в списке.
  const textures: string[] = []
  const textureIndex = new Map<string, number>()
  const indexOf = (sprite: string): number => {
    const existing = textureIndex.get(sprite)
    if (existing !== undefined) return existing
    const next = textures.length
    textures.push(sprite)
    textureIndex.set(sprite, next)
    return next
  }

  const blocks: BlockMesh[] = []

  for (const key of [...new Set(ids)].sort()) {
    const { id, facing, variant } = parseKey(key)
    const pieces = resolve(src, states, id, facing, variant)
    if (pieces.length === 0) {
      problems.push(`${key}: модель не найдена`)
      continue
    }

    // Поворот применяется здесь: браузер получает готовую геометрию и не
    // повторяет таблицу поворотов, на которой уже один раз ошиблись.
    // Составной блок вроде провода склеивается из нескольких частей.
    const quads = pieces.flatMap(({ model, rotation }) =>
      placeQuads(buildQuads(model.elements, model.textures), { x: 0, y: 0, z: 0 }, rotation),
    )
    if (quads.length === 0) {
      problems.push(`${key}: у модели нет ни одной грани`)
      continue
    }

    const tint = BLOCK_TINTS[parseKey(key).id]
    const faces: BlockFace[] = []
    for (const quad of quads) {
      if (!atlas.sprites[quad.sprite]) {
        problems.push(`${key}: текстуры ${quad.sprite} нет в атласе`)
        continue
      }
      faces.push({
        pos: quad.pos.flat(),
        uv: quad.uv.flat(),
        tex: indexOf(quad.sprite),
        shade: quad.shade,
        ...(quad.tint !== null && tint !== undefined ? { tint } : {}),
        ...(quad.cullface ? { cull: quad.cullface } : {}),
      })
    }

    if (faces.length === 0) {
      problems.push(`${key}: ни одной грани с текстурой`)
      continue
    }

    blocks.push({
      id: key,
      faces,
      ...(TRANSLUCENT.has(parseKey(key).id) ? { translucent: true } : {}),
    })
  }

  const entityTextures: Record<string, number> = {}
  for (const [type, sprite] of Object.entries(ENTITY_TEXTURE_SPRITES)) {
    if (atlas.sprites[sprite]) entityTextures[type] = indexOf(sprite)
  }

  // Последняя плитка — сплошная белая: по ней рисуется опора вида.
  const whiteTile = textures.length
  const cols = Math.ceil(Math.sqrt(whiteTile + 1))
  const rows = Math.ceil((whiteTile + 1) / cols)
  const file = await writeAtlas(atlas, textures, cols, rows, outDir)

  return {
    data: {
      file,
      tile: TILE,
      cols,
      atlasWidth: cols * TILE,
      atlasHeight: rows * TILE,
      whiteTile,
      entityTextures,
      blocks,
    },
    problems,
  }
}

interface Piece {
  model: ResolvedModel
  rotation: { x: number; y: number }
}

/** Разбор ключа `redstone^east#nse` на составляющие. */
function parseKey(key: string): { id: string; facing?: string; variant?: string } {
  const [head, variant] = key.split('#')
  const [id, facing] = head!.split('^')
  return { id: id!, ...(facing ? { facing } : {}), ...(variant ? { variant } : {}) }
}

/**
 * Из чего собрать блок.
 *
 * Первым делом спрашиваем игру: блоксостояние знает и нужные модели, и углы.
 * У составного блока частей несколько — у провода это точка и отрезки в
 * стороны. Рукописные модели остаются только для того, что игра рисует своим
 * кодом (сундук, череп, жидкости), и для маркеров схем вроде ведра с водой.
 */
function resolve(
  src: AssetSource,
  states: BlockStates,
  id: string,
  facing?: string,
  variant?: string,
): Piece[] {
  const synthetic = SYNTHETIC_MODELS[id] ?? SPECIAL_MODELS[id]
  if (synthetic) return [{ model: synthetic, rotation: { x: 0, y: 0 } }]

  // Настенный факел в игре — отдельный блок, а не поворот обычного.
  const wall = variant?.split('+').includes('wall')
  const block = (wall ? WALL_FORMS[id] : undefined) ?? BLOCK_STATES[id] ?? id

  // В схеме направление значит «куда смотрит блок». У повторителя и
  // компаратора игра зовёт тем же словом противоположную сторону — перевод
  // делается здесь, и больше нигде.
  const properties: Record<string, string> = {
    ...DEFAULT_STATE[block],
    ...variantProperties(id, variant),
  }
  const facingInGame = gameFacing(id, facing)
  if (facingInGame) properties.facing = facingInGame

  const parts = states
    .partsFor(block, properties)
    .map((part) => ({ model: src.resolveModel(part.model), rotation: { x: part.x, y: part.y } }))
    .filter((part): part is Piece => Boolean(part.model && part.model.elements.length > 0))
  if (parts.length > 0) return parts

  // Запасной путь: блоксостояния может не быть у маркеров и у старых версий.
  for (const name of [BLOCK_MODELS[id], ...(BLOCK_MODEL_FALLBACKS[id] ?? []), `block/${id}`]) {
    if (!name) continue
    const model = src.resolveModel(name)
    if (model && model.elements.length > 0) return [{ model, rotation: { x: 0, y: 0 } }]
  }

  // Совсем запасной: в старых версиях знак и кровать рисовались кодом игры.
  const fallback = SYNTHETIC_FALLBACKS[id]
  return fallback ? [{ model: fallback, rotation: { x: 0, y: 0 } }] : []
}

/**
 * Собирает атлас только из нужных текстур.
 *
 * Анимированные текстуры в игре — вертикальная лента кадров; берём первый,
 * иначе вода и огонь растянулись бы по всей грани.
 */
async function writeAtlas(
  atlas: Awaited<ReturnType<typeof loadAtlas>>,
  textures: string[],
  cols: number,
  rows: number,
  outDir: string,
): Promise<string> {
  const width = cols * TILE
  const height = rows * TILE
  const out = Buffer.alloc(width * height * 4)

  // Белая плитка сразу после текстур: её цвет задают вершины.
  const white = textures.length
  {
    const left = (white % cols) * TILE
    const top = Math.floor(white / cols) * TILE
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const target = ((top + y) * width + left + x) * 4
        out[target] = 255
        out[target + 1] = 255
        out[target + 2] = 255
        out[target + 3] = 255
      }
    }
  }

  textures.forEach((sprite, index) => {
    const rect = atlas.sprites[sprite]
    if (!rect) return
    const [sx, sy, w, h] = rect
    // Анимация — лента кадров: сторона кадра равна ширине спрайта.
    const frame = Math.min(w, h)
    const left = (index % cols) * TILE
    const top = Math.floor(index / cols) * TILE

    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const tx = sx + Math.floor((x / TILE) * frame)
        const ty = sy + Math.floor((y / TILE) * frame)
        const source = (ty * atlas.width + tx) * 4
        const target = ((top + y) * width + left + x) * 4
        for (let channel = 0; channel < 4; channel++) {
          out[target + channel] = atlas.data[source + channel] ?? 0
        }
      }
    }
  })

  const png = await sharp(out, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()

  mkdirSync(outDir, { recursive: true })
  const file = 'blocks.png'
  writeFileSync(join(outDir, file), png)
  return file
}
