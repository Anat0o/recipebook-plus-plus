/**
 * Складывает источники в страницы предметов и режет их на шарды.
 *
 * Полный рецепт хранится один раз — на странице результата. Страницы
 * ингредиентов получают только компактные ссылки, иначе один рецепт досок
 * размножился бы по десяткам предметов.
 */
import type { Ingredient, ItemPage, Source, UseRef } from '../src/lib/schema.ts'

/** Число шардов: страница предмета тянет ~1/64 данных вместо всего массива. */
export const SHARD_COUNT = 64

export function shardOf(itemId: string): number {
  let hash = 0
  for (let i = 0; i < itemId.length; i++) hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0
  return hash % SHARD_COUNT
}

/** Результат источника — предмет, ради которого источник показывают. */
function resultOf(source: Source): string | null {
  switch (source.kind) {
    case 'craft':
    case 'cook':
    case 'stonecut':
    case 'transmute':
    case 'loot':
    case 'trade':
    case 'hardcoded':
      return source.result.id
    case 'smith':
    case 'dynamic':
      return source.result?.id ?? null
  }
}

/** Ингредиенты источника с ролью каждого. */
function ingredientsOf(source: Source): { ingredient: Ingredient; role: UseRef['role'] }[] {
  switch (source.kind) {
    case 'craft':
      return source.grid.filter((g): g is Ingredient => g !== null).map((ingredient) => ({ ingredient, role: 'ingredient' }))
    case 'cook':
    case 'stonecut':
      return [{ ingredient: source.ingredient, role: 'ingredient' }]
    case 'smith':
      return [
        ...(source.template ? [{ ingredient: source.template, role: 'template' as const }] : []),
        { ingredient: source.base, role: 'base' as const },
        { ingredient: source.addition, role: 'addition' as const },
      ]
    case 'transmute':
      return [
        { ingredient: source.input, role: 'ingredient' },
        { ingredient: source.material, role: 'material' },
      ]
    case 'trade':
      return source.cost.map((stack) => ({ ingredient: { items: [stack.id] }, role: 'cost' as const }))
    case 'loot':
    case 'dynamic':
    case 'hardcoded':
      return []
  }
}

export function buildIndex(sources: Source[]): Map<string, ItemPage> {
  const pages = new Map<string, ItemPage>()
  const page = (id: string): ItemPage => {
    const key = normalizeId(id)
    let existing = pages.get(key)
    if (!existing) {
      existing = { from: [], uses: [] }
      pages.set(key, existing)
    }
    return existing
  }

  for (const source of sources) {
    const result = resultOf(source)
    if (result) page(result).from.push(source)

    if (source.kind === 'loot' || source.kind === 'hardcoded') continue
    // Dynamic operations such as armor trims deliberately have no fixed
    // output. They still remain discoverable from every template/base/
    // addition page and lead to the station that performs the operation.
    const useResult = result ?? (source.kind === 'smith' ? 'smithing_table' : 'crafting_table')

    const seen = new Set<string>()
    for (const { ingredient, role } of ingredientsOf(source)) {
      for (const item of ingredient.items) {
        const key = `${normalizeId(item)}|${role}|${useResult}|${source.kind}`
        if (seen.has(key)) continue
        seen.add(key)
        page(item).uses.push({
          kind: source.kind as UseRef['kind'],
          result: normalizeId(useResult),
          role,
        })
      }
    }
  }

  return pages
}

/** Данные игры используют полные идентификаторы, сайт — короткие. */
export function normalizeId(id: string): string {
  return id.replace(/^minecraft:/, '')
}

/** Раскладывает страницы по шардам для записи на диск. */
export function toShards(pages: Map<string, ItemPage>): Record<string, ItemPage>[] {
  const shards: Record<string, ItemPage>[] = Array.from({ length: SHARD_COUNT }, () => ({}))
  for (const [id, page] of pages) shards[shardOf(id)]![id] = page
  return shards
}
