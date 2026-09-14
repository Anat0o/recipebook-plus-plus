/** Единая точка выбора модели и тонировки для иконки предмета. */
import { AssetSource, type ResolvedModel } from './models.ts'
import { SPECIAL_MODELS, tintsFor } from '../curated/icon-overrides.ts'

export interface IconPlan {
  model: ResolvedModel
  tints: (number | null)[]
  /** true — геометрия приблизительная (предмет рисуется движком игры). */
  approx: boolean
}

/** Причины, по которым иконка не получилась, — попадают в отчёт покрытия. */
export type IconMiss = { itemId: string; reason: 'special-без-модели' | 'нет-модели' | 'нет-геометрии' }

export function planIcon(src: AssetSource, itemId: string): IconPlan | IconMiss {
  const tints = tintsFor(itemId)

  const curated = SPECIAL_MODELS[itemId]
  if (curated) return { model: curated, tints, approx: true }

  const kind = src.guiModelFor(itemId)
  if (kind.kind === 'special') {
    // Запасной путь: у базовой модели геометрии нет, но есть текстура частиц —
    // рисуем её плашкой и честно помечаем иконку приблизительной.
    const base = src.resolveModel(kind.base)
    const particle = base?.textures.particle
    if (!particle) return { itemId, reason: 'special-без-модели' }
    return {
      model: { builtin: 'generated', textures: { layer0: particle }, elements: [], display: {}, guiLight: 'front' },
      tints,
      approx: true,
    }
  }
  if (kind.kind === 'missing') return { itemId, reason: 'нет-модели' }

  const model = src.resolveModel(kind.models[0]!)
  if (!model) return { itemId, reason: 'нет-модели' }
  if (model.builtin !== 'generated' && model.elements.length === 0) {
    return { itemId, reason: 'нет-геометрии' }
  }
  return { model, tints, approx: false }
}

export function isMiss(x: IconPlan | IconMiss): x is IconMiss {
  return 'reason' in x
}

/**
 * Баннеры игра рисует своим кодом, поэтому обычным путём у них выходит
 * заглушка из текстуры частиц (доски). Но лицевая сторона флага лежит в
 * атласе как маска, а цвет известен — значит, настоящую иконку можно собрать.
 */
export function bannerIconFor(itemId: string, colors: Record<string, string>): string | null {
  const found = /^([a-z_]+)_banner$/.exec(itemId)
  const color = found?.[1]
  return color && color in colors ? color : null
}
