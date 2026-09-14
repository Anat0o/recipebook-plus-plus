/** Загрузка и рекурсивное разворачивание тегов (#minecraft:planks → список предметов). */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type TagValue = string | { id: string; required?: boolean }

export class TagIndex {
  private readonly raw = new Map<string, TagValue[]>()
  private readonly resolved = new Map<string, string[]>()

  constructor(dataRoot: string, registry: 'item' | 'block' | 'entity_type' | 'enchantment') {
    const dir = join(dataRoot, 'tags', registry)
    if (!existsSync(dir)) return
    for (const file of walk(dir)) {
      const name = file.slice(dir.length + 1, -'.json'.length).replaceAll('\\', '/')
      const json = JSON.parse(readFileSync(file, 'utf8')) as { values?: TagValue[] }
      this.raw.set(`minecraft:${name}`, json.values ?? [])
    }
  }

  has(tag: string): boolean {
    return this.raw.has(normalize(tag))
  }

  /** Плоский список идентификаторов; вложенные теги разворачиваются. */
  resolve(tag: string, seen = new Set<string>()): string[] {
    const key = normalize(tag)
    const cached = this.resolved.get(key)
    if (cached) return cached
    if (seen.has(key)) return []
    seen.add(key)

    const out: string[] = []
    for (const value of this.raw.get(key) ?? []) {
      const id = typeof value === 'string' ? value : value.id
      if (id.startsWith('#')) out.push(...this.resolve(id.slice(1), seen))
      else out.push(id)
    }
    const unique = [...new Set(out)]
    this.resolved.set(key, unique)
    return unique
  }

  get size(): number {
    return this.raw.size
  }
}

function normalize(tag: string): string {
  const clean = tag.replace(/^#/, '')
  return clean.includes(':') ? clean : `minecraft:${clean}`
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (entry.name.endsWith('.json')) yield path
  }
}
