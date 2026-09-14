/**
 * Контрольный лист иконок для глазами-проверки рендера.
 * Запуск: npx tsx tools/preview-icons.ts [id …]
 */
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { AssetSource } from './mc/models.ts'
import { loadAtlas } from './mc/atlas.ts'
import { renderIcon } from './mc/render.ts'
import { isMiss, planIcon } from './mc/icons.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { DEFAULT_VERSION } from './config.ts'

const DEFAULT_IDS = [
  'diamond_ore', 'crafting_table', 'oak_slab', 'torch', 'diamond', 'wither_skeleton_skull',
  'music_disc_cat', 'brewing_stand', 'enchanting_table', 'oak_stairs', 'furnace', 'cake',
]

const version = process.env.MC_VERSION ?? DEFAULT_VERSION
const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const list = ids.length > 0 ? ids : DEFAULT_IDS

const src = new AssetSource(`${sourceDir(version, 'assets-json')}/assets/minecraft`)
const atlas = await loadAtlas(sourceDir(version, 'atlas'))
console.log(`атлас ${atlas.width}×${atlas.height}, спрайтов: ${Object.keys(atlas.sprites).length}`)

const SIZE = 64
const cols = Math.min(6, list.length)
const rows = Math.ceil(list.length / cols)
const sheet = Buffer.alloc(cols * SIZE * rows * SIZE * 4)

list.forEach((id, i) => {
  const plan = planIcon(src, id)
  if (isMiss(plan)) {
    console.log(`  ${id}: ${plan.reason}`)
    return
  }
  const data = renderIcon(plan.model, atlas, SIZE, plan.tints)?.data
  if (!data) {
    console.log(`  ${id}: рендер не дал результата`)
    return
  }
  const cx = (i % cols) * SIZE
  const cy = Math.floor(i / cols) * SIZE
  for (let y = 0; y < SIZE; y++) {
    data.copy(sheet, ((cy + y) * cols * SIZE + cx) * 4, y * SIZE * 4, (y + 1) * SIZE * 4)
  }
})

const out = process.env.PREVIEW_OUT ?? 'icons-preview.png'
const png = await sharp(sheet, { raw: { width: cols * SIZE, height: rows * SIZE, channels: 4 } })
  .png()
  .toBuffer()
writeFileSync(out, png)
console.log(`записано: ${out} (${list.join(', ')})`)
