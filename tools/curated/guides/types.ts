/**
 * Формат гайдов по фермам и редстоуну.
 *
 * Схема — это слои по высоте, снизу вверх, каждый слой сетка блоков. Сетка
 * остаётся удобным способом писать постройку руками, а сборка разворачивает её
 * в трёхмерный список установок: столбец даёт X, строка — Z, слой — Y.
 *
 * Ячейка — идентификатор блока с необязательными суффиксами:
 *
 *   `piston`          блок с поворотом модели по умолчанию
 *   `piston^east`     смотрит на восток
 *   `piston^east@3`   ставится на третьем шаге
 *   `hopper@2`        поворот по умолчанию, второй шаг
 *
 * Без `@` шаг равен номеру слоя: постройка растёт снизу вверх. Направление
 * пишется только там, где оно осмысленно, — для поршня и наблюдателя это
 * половина смысла схемы, для булыжника не значит ничего.
 */

/** Пустая клетка схемы. */
export const _ = ''

export type Edition = 'java' | 'bedrock'
export type Category = 'farm' | 'redstone'

export interface CellSpec {
  block: string
  facing?: string
  step?: number
  /** Состояние модели: delay_4, upper, head и другие именованные варианты. */
  variant?: string
  /** Начальное логическое состояние компонента, если симметричная схема сама его не определяет. */
  active?: boolean
  /** Оболочка скрывается в режиме разреза, но остаётся в материалах. */
  shell?: boolean
}

export type Cell = string | CellSpec

export interface Layer {
  /** Строки сетки сверху вниз, если смотреть на схему с высоты птичьего полёта. */
  grid: Cell[][]
}

/** Разбор ячейки: `piston^east@3` → блок, направление, шаг. */
export function parseCell(cell: Cell): CellSpec | null {
  if (typeof cell !== 'string') return cell.block && cell.block !== 'air' ? { ...cell } : null
  if (!cell || cell === 'air') return null
  const match = /^([a-z0-9_]+)(?:\^([a-z]+))?(?:@(\d+))?$/.exec(cell)
  if (!match) throw new Error(`не разобрать ячейку схемы: ${cell}`)
  return {
    block: match[1]!,
    ...(match[2] ? { facing: match[2] } : {}),
    ...(match[3] ? { step: Number(match[3]) } : {}),
  }
}

export interface Step {
  ru: string
  en: string
}

export interface Schematic {
  ru: string
  en: string
  /**
   * Действия по шагам: шаг — это ровно одна ступень сборки.
   *
   * Список один на схему, и он же подписи шагов в трёхмерном виде. Раньше
   * списков было два — прозаический «порядок сборки» и лента вкладок, — и они
   * расходились: у фермы бамбука было три пункта текста против пяти ступеней.
   * Сборка теперь требует, чтобы длина совпадала.
   */
  steps: Step[]
  layers: Layer[]
  /** Сущности, без которых механизм нельзя понять или повторить. */
  entities?: EntitySpec[]
  /** Детерминированный показ одного рабочего цикла. */
  animation?: AnimationSpec
}

export interface EntitySpec {
  id: string
  type: string
  x: number
  y: number
  z: number
  facing?: string
  scale?: number
  step?: number
  variant?: string
  active?: boolean
  visible?: boolean
}

export type SceneEvent =
  | { tick: number; type: 'press'; x: number; y: number; z: number }
  | { tick: number; type: 'block'; x: number; y: number; z: number; block?: string; facing?: string; variant?: string }
  | { tick: number; type: 'container'; x: number; y: number; z: number; signal: number }
  | { tick: number; type: 'move'; entity: string; x: number; y: number; z: number }
  | { tick: number; type: 'show'; entity: string; visible: boolean }

export interface AnimationSpec {
  /** Длина цикла в редстоун-тиках (10 тиков в секунду). */
  duration: number
  loop?: boolean
  events: SceneEvent[]
}

/** Одна установка блока в трёхмерной постройке. */
export interface Placement {
  x: number
  y: number
  z: number
  block: string
  facing?: string
  /**
   * Форма блока, зависящая от соседей: у редстоуновой пыли это стороны,
   * в которые она тянется («ns», «new»). Считается сборкой по всей постройке.
   */
  variant?: string
  shell?: boolean
  /** Номер шага сборки, начиная с единицы. */
  step: number
}

export interface Guide {
  id: string
  category: Category
  ru: string
  en: string
  /** Иконка раздела — предмет, ради которого всё строится. */
  icon: string
  /** Издания, на которых схема работает как описано. */
  editions: Edition[]
  /**
   * Предметы-маркеры версии: если их нет, гайд в этой версии не показывается.
   * Блоки схемы проверяются и так, здесь — то, что в схему не попало.
   */
  requires?: string[]
  ruSummary: string
  enSummary: string
  /** Что понадобится: идентификатор и количество. */
  materials: { id: string; count: number }[]
  schematics: Schematic[]
  /** Оговорки: что ломается, чего не хватает, чем отличается на Bedrock. */
  ruNotes: string[]
  enNotes: string[]
}
