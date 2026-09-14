/**
 * Поиск по предметам: точное совпадение, префикс, вхождение — в таком порядке.
 * Ищем сразу по всем языкам и по идентификатору, чтобы находилось и «алмаз»,
 * и «diamond», и «diamond_ore».
 */
import type { ItemEntry } from './schema.ts'

export interface SearchHit {
  item: ItemEntry
  score: number
}

export function searchItems(items: ItemEntry[], query: string, limit = 60): ItemEntry[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []

  const hits: SearchHit[] = []
  for (const item of items) {
    const score = scoreItem(item, q)
    if (score > 0) hits.push({ item, score })
  }

  hits.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
  return hits.slice(0, limit).map((hit) => hit.item)
}

function scoreItem(item: ItemEntry, q: string): number {
  const candidates = [item.id.replaceAll('_', ' '), item.id, ...Object.values(item.names)]
  let best = 0
  for (const candidate of candidates) {
    const value = candidate.toLowerCase()
    if (value === q) best = Math.max(best, 100)
    else if (value.startsWith(q)) best = Math.max(best, 80 - value.length * 0.01)
    else if (wordStartsWith(value, q)) best = Math.max(best, 60 - value.length * 0.01)
    else if (value.includes(q)) best = Math.max(best, 40 - value.length * 0.01)
  }
  return best
}

function wordStartsWith(value: string, q: string): boolean {
  return value.split(/[\s_-]+/).some((word) => word.startsWith(q))
}
