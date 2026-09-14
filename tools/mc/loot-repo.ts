/** Доступ к таблицам добычи версии по их идентификаторам. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { LootContext } from './loot.ts'

export class LootRepository {
  private readonly cache = new Map<string, unknown>()
  private readonly root: string

  constructor(dataRoot: string) {
    this.root = join(dataRoot, 'loot_table')
  }

  /** `minecraft:entities/wither_skeleton` или `entities/wither_skeleton`. */
  get(id: string): unknown | null {
    const path = id.replace(/^minecraft:/, '')
    if (this.cache.has(path)) return this.cache.get(path) ?? null
    const file = join(this.root, `${path}.json`)
    const value = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
    this.cache.set(path, value)
    return value
  }

  /** Все таблицы версии: путь без расширения → содержимое. */
  list(): { path: string; json: any }[] {
    const out: { path: string; json: any }[] = []
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.json')) {
          const path = relative(this.root, full).slice(0, -'.json'.length).split(sep).join('/')
          out.push({ path, json: JSON.parse(readFileSync(full, 'utf8')) })
        }
      }
    }
    walk(this.root)
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }
}

export function context(partial: Partial<LootContext>): LootContext {
  return { fortune: 0, looting: 0, killedByPlayer: true, silkTouch: false, ...partial }
}
