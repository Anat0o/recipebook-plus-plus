/**
 * Контракт данных между сборщиком (tools/) и сайтом (src/).
 * Всё, что показывает страница предмета, приводится к типу Source.
 */

export interface Stack {
  id: string
  count?: number
}

/** Ингредиент: конкретный список предметов, при наличии — с исходным тегом. */
export interface Ingredient {
  /** Например `minecraft:planks`, если рецепт принимает любой предмет тега. */
  tag?: string
  items: string[]
}

export type CookingStation = 'furnace' | 'blast_furnace' | 'smoker' | 'campfire'

/** Где предмет добыт. Разные варианты рисуются разными GUI. */
export type Source =
  | {
      kind: 'craft'
      shaped: boolean
      width: number
      height: number
      /** Сетка width×height, null — пустая клетка. Для бесформенных — просто список. */
      grid: (Ingredient | null)[]
      result: Stack
      group?: string
    }
  | { kind: 'cook'; station: CookingStation; ingredient: Ingredient; result: Stack; xp: number; time: number }
  | { kind: 'stonecut'; ingredient: Ingredient; result: Stack }
  | {
      kind: 'smith'
      variant: 'transform' | 'trim'
      template: Ingredient | null
      base: Ingredient
      addition: Ingredient
      result: Stack | null
    }
  | { kind: 'transmute'; input: Ingredient; material: Ingredient; result: Stack }
  /**
   * Рецепты, у которых состав вычисляется кодом игры (фейерверки, копирование книг,
   * починка парой предметов). Показываем как пояснение, а не как сетку.
   */
  | { kind: 'dynamic'; recipeType: string; result: Stack | null }
  | {
      kind: 'loot'
      /** Путь таблицы, например `entities/wither_skeleton`. */
      table: string
      context: LootContext
      /** Источник в терминах игры: id моба, блока, название сундука. */
      origin: string
      result: Stack
      /** Вероятность выпадения хотя бы одной штуки, 0..1. */
      chance: number
      /** Матожидание количества за один сброс лута. */
      expected: number
      /** Как меняется шанс с уровнями Удачи/Добычи: индекс = уровень. */
      byLevel?: { enchantment: 'fortune' | 'looting'; chance: number[]; expected: number[] }
      /** Человекочитаемые условия: «убит игроком», «нужен шёлк» и т. п. */
      conditions: string[]
      /**
       * Блок при разрушении даёт сам себя и никаких условий для этого нет.
       * Такие карточки прячутся — кроме предметов, у которых других
       * способов получения не осталось.
       */
      selfDrop?: boolean
    }
  /**
   * Способ получения, зашитый в код игры: таблицы добычи для него нет.
   * `note` — ключ описания, перевод живёт в src/i18n.
   */
  | { kind: 'hardcoded'; result: Stack; note: string; icon?: string }
  | {
      kind: 'trade'
      profession: string
      level: number
      cost: Stack[]
      result: Stack
      maxUses?: number
      /** Пул, из которого игра случайно выбирает предложения. */
      pool?: string
      poolSize?: number
      poolPicks?: number
      xp?: number
      reputationDiscount?: number
      merchantVariants?: string[]
      /** Человекочитаемые ключи модификаторов результата. */
      modifiers?: string[]
      dynamicCost?: boolean
    }

export type LootContext =
  | 'block' | 'entity' | 'chest' | 'gameplay' | 'archaeology' | 'shearing'
  | 'harvest' | 'spawner' | 'dispenser' | 'pot' | 'equipment' | 'other'

/** Запись реестра предметов. */
export interface ItemEntry {
  id: string
  names: Record<string, string>
  isBlock: boolean
  /**
   * Ни одного способа получить в игре: только командой или из творческого
   * режима. По умолчанию такие предметы скрыты, показ включается в настройках.
   */
  commandOnly?: boolean
}

/** Ссылка «здесь предмет используется» — без полного повторения рецепта. */
export interface UseRef {
  kind: 'craft' | 'cook' | 'stonecut' | 'smith' | 'transmute' | 'trade' | 'dynamic'
  /** Что получается на выходе. */
  result: string
  /** Роль предмета в рецепте. */
  role: 'ingredient' | 'base' | 'template' | 'addition' | 'material' | 'cost'
}

/** Всё, что нужно странице одного предмета. */
export interface ItemPage {
  /** Способы получить предмет. */
  from: Source[]
  /** Где предмет применяется. */
  uses: UseRef[]
  /**
   * Многоблочные постройки, в которых участвует предмет: призыв Визера,
   * големы, маяк. В рецептах их нет — форму проверяет код игры,
   * поэтому они лежат отдельным справочником multiblocks.json.
   */
  multiblocks?: string[]
}

/** Индекс версии: путь к атласу, число шардов и т. п. */
export interface VersionMeta {
  version: string
  label: string
  dataDrivenTrades: boolean
  shards: number
  /** Фоновые плитки из текстур версии. */
  tiles: { light: string; dark: string; flame: string; flameFrames: number }
}
