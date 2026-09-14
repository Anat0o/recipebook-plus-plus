/**
 * Ручные дополнения к рендеру иконок.
 *
 * Две вещи не выводятся из ассетов:
 *  1) цвета тонировки (tintindex) — в игре они зависят от биома и зашиты в код;
 *  2) геометрия предметов с типом `minecraft:special` — её рисует движок игры.
 */
import type { ResolvedModel } from '../mc/models.ts'

/** Проверено для версий: */
export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

const GRASS = 0x79c05a
const FOLIAGE = 0x59ae30

/** Цвет по индексу тонировки. Значения соответствуют равнинному биому, как в инвентаре игры. */
const TINT_BY_ITEM: Record<string, number[]> = {
  grass_block: [GRASS],
  short_grass: [GRASS],
  tall_grass: [GRASS],
  fern: [GRASS],
  large_fern: [GRASS],
  vine: [FOLIAGE],
  lily_pad: [0x208030],
  spruce_leaves: [0x619961],
  birch_leaves: [0x80a755],
  mangrove_leaves: [0x92c648],
}

export function tintsFor(itemId: string): (number | null)[] {
  const explicit = TINT_BY_ITEM[itemId]
  if (explicit) return explicit
  if (itemId.endsWith('_leaves')) return [FOLIAGE]
  return []
}

/** Куб головы 8×8×8 с раскладкой UV из текстуры моба (64×32 или 64×64). */
function skullModel(texture: string, textureHeight: 32 | 64): ResolvedModel {
  // Пиксель текстуры → единицы UV модели (0..16 на весь спрайт).
  const u = (px: number): number => (px / 64) * 16
  const v = (px: number): number => (px / textureHeight) * 16
  const face = (x1: number, y1: number, x2: number, y2: number) => ({
    texture: '#skin',
    uv: [u(x1), v(y1), u(x2), v(y2)] as [number, number, number, number],
  })
  return {
    builtin: null,
    textures: { skin: texture },
    guiLight: 'side',
    display: { gui: { rotation: [30, 225, 0], translation: [0, 0, 0], scale: [0.625, 0.625, 0.625] } },
    elements: [
      {
        from: [4, 0, 4],
        to: [12, 8, 12],
        faces: {
          up: face(8, 0, 16, 8),
          down: face(16, 8, 24, 0),
          north: face(8, 8, 16, 16),
          east: face(0, 8, 8, 16),
          south: face(24, 8, 32, 16),
          west: face(16, 8, 24, 16),
        },
      },
    ],
  }
}

/** Модели для предметов, которые игра рисует своим кодом. Ключ — id предмета. */
export const SPECIAL_MODELS: Record<string, ResolvedModel> = {
  skeleton_skull: skullModel('entity/skeleton/skeleton', 32),
  wither_skeleton_skull: skullModel('entity/skeleton/wither_skeleton', 32),
  zombie_head: skullModel('entity/zombie/zombie', 64),
  creeper_head: skullModel('entity/creeper/creeper', 32),
  piglin_head: skullModel('entity/piglin/piglin', 64),
  player_head: skullModel('entity/player/wide/steve', 64),
}
