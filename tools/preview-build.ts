/**
 * Контрольный лист 3D-построек.
 * Запуск: npx tsx tools/preview-build.ts [id гайда или постройки …]
 *
 * Рисует каждый шаг сборки и готовый результат тем же растеризатором и той же
 * геометрией, что уходят в браузер. Смотреть обязательно: неверно повёрнутый
 * поршень выглядит правдоподобно и молча учит неправильному.
 */
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { loadAtlas } from './mc/atlas.ts'
import { renderScene } from './mc/render.ts'
import { buildQuads, placeQuads, type Quad } from './mc/quads.ts'
import { AssetSource, type ResolvedModel } from './mc/models.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DEFAULT_VERSION } from './config.ts'
import { SPECIAL_MODELS } from './curated/icon-overrides.ts'
import {
  BLOCK_MODELS, BLOCK_STATES, BLOCK_TINTS, DEFAULT_STATE, gameFacing, SYNTHETIC_MODELS,
  variantProperties, WALL_FORMS,
} from './curated/block-models.ts'
import { BlockStates } from './mc/blockstates.ts'
import { ALL_GUIDES } from './build-guides.ts'
import { MULTIBLOCKS } from './curated/multiblocks.ts'
import { toPlacements } from './mc/placements.ts'
import type { Placement } from './curated/guides/types.ts'

const SIZE = Number(process.env.PREVIEW_SIZE ?? 168)
const PAD = 6
const version = process.env.MC_VERSION ?? DEFAULT_VERSION
const wanted = process.argv.slice(2).filter((argument) => !argument.startsWith('-'))

const src = new AssetSource(`${sourceDir(version, 'assets-json')}/assets/minecraft`)
const atlas = await loadAtlas(sourceDir(version, 'atlas'))

const states = new BlockStates(`${sourceDir(version, 'assets-json')}/assets/minecraft`)

/** Та же цепочка, что в сборке: рукописные модели, потом части блоксостояния. */
function piecesOf(
  id: string,
  facing?: string,
  variant?: string,
): { model: ResolvedModel; rotation: { x: number; y: number } }[] {
  const synthetic = SYNTHETIC_MODELS[id] ?? SPECIAL_MODELS[id]
  if (synthetic) return [{ model: synthetic, rotation: { x: 0, y: 0 } }]

  const wall = variant?.split('+').includes('wall')
  const block = (wall ? WALL_FORMS[id] : undefined) ?? BLOCK_STATES[id] ?? id
  const properties: Record<string, string> = {
    ...DEFAULT_STATE[block],
    ...variantProperties(id, variant),
  }
  const facingInGame = gameFacing(id, facing)
  if (facingInGame) properties.facing = facingInGame

  const parts = states
    .partsFor(block, properties)
    .map((part) => ({ model: src.resolveModel(part.model), rotation: { x: part.x, y: part.y } }))
    .filter((part): part is { model: ResolvedModel; rotation: { x: number; y: number } } =>
      Boolean(part.model && part.model.elements.length > 0),
    )
  if (parts.length > 0) return parts

  const fallback = src.resolveModel(BLOCK_MODELS[id] ?? `block/${id}`)
  return fallback ? [{ model: fallback, rotation: { x: 0, y: 0 } }] : []
}

const meshCache = new Map<string, Quad[]>()
function meshOf(id: string, facing?: string, variant?: string): Quad[] {
  const key = `${id}${facing ? '^' + facing : ''}${variant ? '#' + variant : ''}`
  const cached = meshCache.get(key)
  if (cached) return cached
  const tint = BLOCK_TINTS[id]
  const quads = piecesOf(id, facing, variant)
    .flatMap(({ model, rotation }) =>
      placeQuads(buildQuads(model.elements, model.textures), { x: 0, y: 0, z: 0 }, rotation),
    )
    .map((quad) => (quad.tint !== null && tint !== undefined ? { ...quad, tintColor: tint } : quad))
  meshCache.set(key, quads)
  return quads
}

/** Грани всей постройки на заданном шаге. */
function sceneQuads(placements: Placement[], upTo: number): Quad[] {
  const quads: Quad[] = []
  for (const placement of placements) {
    if (placement.step > upTo) continue
    const mesh = meshOf(placement.block, placement.facing, placement.variant)
    if (mesh.length === 0) console.warn(`  нет геометрии: ${placement.block}`)
    quads.push(...placeQuads(mesh, placement, { x: 0, y: 0 }))
  }
  return quads
}

interface Build {
  id: string
  title: string
  placements: Placement[]
}

const builds: Build[] = [
  ...ALL_GUIDES.flatMap((guide) =>
    guide.schematics.map((schematic, index) => ({
      id: guide.schematics.length > 1 ? `${guide.id}#${index + 1}` : guide.id,
      title: `${guide.ru} — ${schematic.ru}`,
      placements: toPlacements(schematic.layers),
    })),
  ),
  ...MULTIBLOCKS.map((entry) => ({
    id: entry.id,
    title: entry.ru,
    placements: toPlacements(entry.layers.map((grid) => ({ grid }))),
  })),
]

const shown = wanted.length > 0 ? builds.filter((b) => wanted.some((w) => b.id.startsWith(w))) : builds
if (shown.length === 0) {
  console.error('Ничего не найдено по этим id.')
  process.exit(1)
}

// Строка на постройку: шаги слева направо, последний кадр — готовый результат.
const cols = Math.max(...shown.map((b) => Math.max(...b.placements.map((p) => p.step), 1)))
const sheetW = cols * (SIZE + PAD) + PAD
const sheetH = shown.length * (SIZE + PAD) + PAD
const sheet = Buffer.alloc(sheetW * sheetH * 4)
for (let i = 0; i < sheetW * sheetH; i++) {
  sheet[i * 4] = 44
  sheet[i * 4 + 1] = 46
  sheet[i * 4 + 2] = 52
  sheet[i * 4 + 3] = 255
}

shown.forEach((build, row) => {
  const steps = Math.max(...build.placements.map((p) => p.step), 1)
  console.log(`${row + 1}. ${build.id} — ${build.title} (${steps} шаг., ${build.placements.length} бл.)`)

  const full = sceneQuads(build.placements, steps).flatMap((q) => q.pos)
  const bounds = {
    min: [0, 1, 2].map((i) => Math.min(...full.map((p) => p[i]!))) as [number, number, number],
    max: [0, 1, 2].map((i) => Math.max(...full.map((p) => p[i]!))) as [number, number, number],
  }

  for (let step = 1; step <= steps; step++) {
    const quads = sceneQuads(build.placements, step)
    const frame = renderScene(quads, atlas, SIZE, { yaw: 35, pitch: 25, bounds })
    const left = PAD + (step - 1) * (SIZE + PAD)
    const top = PAD + row * (SIZE + PAD)

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const source = (y * SIZE + x) * 4
        const alpha = frame.data[source + 3]! / 255
        if (alpha === 0) continue
        const target = ((top + y) * sheetW + left + x) * 4
        for (let channel = 0; channel < 3; channel++) {
          sheet[target + channel] = Math.round(
            frame.data[source + channel]! * alpha + sheet[target + channel]! * (1 - alpha),
          )
        }
      }
    }
  }
})

const out = process.env.PREVIEW_OUT ?? 'build-preview.png'
const png = await sharp(sheet, { raw: { width: sheetW, height: sheetH, channels: 4 } })
  .png()
  .toBuffer()
writeFileSync(out, png)
console.log(`\nзаписано: ${out} (${sheetW}×${sheetH})`)
