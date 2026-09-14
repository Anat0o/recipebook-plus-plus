/**
 * Разбор data/minecraft/recipe/*.json в нормализованные источники.
 *
 * Ингредиенты приводятся к спискам предметов: тег `#minecraft:planks`
 * разворачивается, но сохраняется, чтобы UI мог показать «любые доски».
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Ingredient, Source, Stack, CookingStation } from '../src/lib/schema.ts'
import type { TagIndex } from './mc/tags.ts'

/** Время готовки по умолчанию, тиков. */
const DEFAULT_COOK_TIME: Record<CookingStation, number> = {
  furnace: 200,
  blast_furnace: 100,
  smoker: 100,
  campfire: 600,
}

const COOKING_TYPES: Record<string, CookingStation> = {
  'minecraft:smelting': 'furnace',
  'minecraft:blasting': 'blast_furnace',
  'minecraft:smoking': 'smoker',
  'minecraft:campfire_cooking': 'campfire',
}

export interface RecipeBuildResult {
  sources: Source[]
  /** Типы рецептов, которые не удалось разобрать, — попадают в отчёт покрытия. */
  unsupported: Record<string, number>
  fileCount: number
}

export function buildRecipes(dataRoot: string, itemTags: TagIndex, knownItems: Set<string>): RecipeBuildResult {
  const dir = join(dataRoot, 'recipe')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const sources: Source[] = []
  const unsupported: Record<string, number> = {}

  for (const file of files) {
    const recipe = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    const parsed = parseRecipe(recipe, itemTags, file.slice(0, -'.json'.length), knownItems)
    if (parsed) sources.push(parsed)
    else unsupported[recipe.type] = (unsupported[recipe.type] ?? 0) + 1
  }

  return { sources, unsupported, fileCount: files.length }
}

/**
 * У особых рецептов поля `result` нет — состав считает код игры. Но имя файла
 * его выдаёт: `black_banner_duplicate` → `black_banner`, `leather_boots_dyed` →
 * `leather_boots`. Без этого особые рецепты вообще не попали бы на страницы.
 */
const SPECIAL_RESULTS: Record<string, string> = {
  book_cloning: 'written_book',
  map_extending: 'filled_map',
  shield_decoration: 'shield',
  firework_star_fade: 'firework_star',
}

const SPECIAL_SUFFIXES = ['_duplicate', '_dyed', '_cloning', '_extending', '_decoration', '_fade']

function guessSpecialResult(fileName: string, knownItems: Set<string>): string | null {
  const candidates = [SPECIAL_RESULTS[fileName], fileName]
  for (const suffix of SPECIAL_SUFFIXES) {
    if (fileName.endsWith(suffix)) candidates.push(fileName.slice(0, -suffix.length))
  }
  for (const candidate of candidates) {
    if (candidate && knownItems.has(candidate)) return candidate
  }
  // Починка двух предметов результата не имеет — это честный null.
  return null
}

function parseRecipe(recipe: any, tags: TagIndex, fileName: string, knownItems: Set<string>): Source | null {
  const type: string = recipe.type

  if (type === 'minecraft:crafting_shaped') return parseShaped(recipe, tags)
  if (type === 'minecraft:crafting_shapeless') return parseShapeless(recipe, tags)

  const station = COOKING_TYPES[type]
  if (station) {
    return {
      kind: 'cook',
      station,
      ingredient: ingredient(recipe.ingredient, tags),
      result: stack(recipe.result),
      xp: recipe.experience ?? 0,
      time: recipe.cookingtime ?? DEFAULT_COOK_TIME[station],
    }
  }

  if (type === 'minecraft:stonecutting') {
    return { kind: 'stonecut', ingredient: ingredient(recipe.ingredient, tags), result: stack(recipe.result) }
  }

  if (type === 'minecraft:smithing_transform' || type === 'minecraft:smithing_trim') {
    return {
      kind: 'smith',
      variant: type.endsWith('transform') ? 'transform' : 'trim',
      template: recipe.template ? ingredient(recipe.template, tags) : null,
      base: ingredient(recipe.base, tags),
      addition: ingredient(recipe.addition, tags),
      // У нанесения узора результат зависит от заготовки — фиксированного предмета нет.
      result: recipe.result ? stack(recipe.result) : null,
    }
  }

  if (type === 'minecraft:crafting_transmute') {
    return {
      kind: 'transmute',
      input: ingredient(recipe.input, tags),
      material: ingredient(recipe.material, tags),
      result: stack(recipe.result),
    }
  }

  // Остальные — рецепты, состав которых вычисляет код игры.
  if (type.startsWith('minecraft:crafting_')) {
    const guessed = guessSpecialResult(fileName, knownItems)
    return {
      kind: 'dynamic',
      recipeType: type.replace('minecraft:', ''),
      result: recipe.result ? stack(recipe.result) : guessed ? { id: guessed } : null,
    }
  }

  return null
}

function parseShaped(recipe: any, tags: TagIndex): Source {
  const pattern: string[] = recipe.pattern
  const height = pattern.length
  const width = Math.max(...pattern.map((row) => row.length))
  const key: Record<string, unknown> = recipe.key ?? {}

  const grid: (Ingredient | null)[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const symbol = pattern[y]![x] ?? ' '
      grid.push(symbol === ' ' || !key[symbol] ? null : ingredient(key[symbol], tags))
    }
  }

  return { kind: 'craft', shaped: true, width, height, grid, result: stack(recipe.result), group: recipe.group }
}

function parseShapeless(recipe: any, tags: TagIndex): Source {
  const list: Ingredient[] = (recipe.ingredients ?? []).map((i: unknown) => ingredient(i, tags))
  // Бесформенный рецепт раскладываем в сетку 3×3 просто по порядку.
  const width = Math.min(3, Math.max(1, list.length))
  const height = Math.ceil(list.length / width)
  const grid: (Ingredient | null)[] = []
  for (let i = 0; i < width * height; i++) grid.push(list[i] ?? null)

  return { kind: 'craft', shaped: false, width, height, grid, result: stack(recipe.result), group: recipe.group }
}

/** Ингредиент бывает строкой, тегом `#…` или массивом вариантов. */
function ingredient(value: unknown, tags: TagIndex): Ingredient {
  if (typeof value === 'string') {
    if (value.startsWith('#')) return { tag: value.slice(1), items: tags.resolve(value) }
    return { items: [value] }
  }
  if (Array.isArray(value)) {
    const items = value.flatMap((v) => ingredient(v, tags).items)
    return { items: [...new Set(items)] }
  }
  if (value && typeof value === 'object' && 'item' in value) {
    return { items: [String((value as { item: string }).item)] }
  }
  return { items: [] }
}

function stack(result: unknown): Stack {
  if (typeof result === 'string') return { id: result }
  const r = result as { id: string; count?: number }
  return r.count && r.count > 1 ? { id: r.id, count: r.count } : { id: r.id }
}
