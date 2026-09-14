/**
 * Резолвер моделей предметов Minecraft.
 *
 * Цепочка: assets/minecraft/items/<id>.json (описание предмета) → ссылка на модель →
 * assets/minecraft/models/**.json с наследованием через `parent`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type Vec3 = [number, number, number]
export type Vec4 = [number, number, number, number]

export interface ModelFace {
  texture: string
  uv?: Vec4
  rotation?: number
  tintindex?: number
  cullface?: string
}

export interface ModelElement {
  from: Vec3
  to: Vec3
  rotation?: { origin: Vec3; axis: 'x' | 'y' | 'z'; angle: number; rescale?: boolean }
  shade?: boolean
  faces: Partial<Record<FaceName, ModelFace>>
}

export type FaceName = 'down' | 'up' | 'north' | 'south' | 'west' | 'east'
export const FACES: FaceName[] = ['down', 'up', 'north', 'south', 'west', 'east']

export interface DisplayTransform {
  rotation?: Vec3
  translation?: Vec3
  scale?: Vec3
}

/** Модель после разворачивания всей цепочки `parent`. */
export interface ResolvedModel {
  /** Корневой builtin-предок: 'generated' — плоский спрайт, 'entity' — рисует движок игры. */
  builtin: 'generated' | 'entity' | null
  textures: Record<string, string>
  elements: ModelElement[]
  display: Record<string, DisplayTransform>
  guiLight: 'front' | 'side'
}

/** Как получена иконка — влияет на пометку в UI. */
export type IconKind =
  | { kind: 'model'; models: string[] }
  /** Геометрия зашита в код игры (сундуки, шалкеры, знамёна, головы) — точный рендер невозможен. */
  | { kind: 'special'; base: string; special: string }
  | { kind: 'missing' }

export class AssetSource {
  constructor(private readonly assetsRoot: string) {}

  private readonly modelCache = new Map<string, ResolvedModel | null>()

  private readJson(relPath: string): any | null {
    const file = join(this.assetsRoot, relPath)
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  }

  /** Список всех предметов реестра (по файлам описаний). */
  listItems(): string[] {
    const dir = join(this.assetsRoot, 'items')
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort()
  }

  /**
   * Выбирает модель для отображения в GUI (инвентарь).
   * Условные ветки разрешаются в состояние «предмет лежит в слоте»:
   * select по display_context → ветка gui, condition → on_false, range_dispatch → fallback.
   */
  guiModelFor(itemId: string): IconKind {
    const def = this.readJson(`items/${itemId}.json`)
    if (!def?.model) return { kind: 'missing' }

    const collected: string[] = []
    type Special = { base: string; special: string }
    let special: Special | null = null

    const walk = (node: any): void => {
      if (!node || typeof node !== 'object') return
      switch (node.type) {
        case 'minecraft:model':
          if (typeof node.model === 'string') collected.push(node.model)
          return
        case 'minecraft:composite':
          for (const m of node.models ?? []) walk(m)
          return
        case 'minecraft:select': {
          // Предмет в инвентаре — это контекст gui; для остальных свойств берём fallback.
          if (node.property === 'minecraft:display_context') {
            const guiCase = (node.cases ?? []).find((c: any) =>
              (Array.isArray(c.when) ? c.when : [c.when]).includes('gui'),
            )
            walk(guiCase ? guiCase.model : node.fallback)
            return
          }
          walk(node.fallback ?? node.cases?.[0]?.model)
          return
        }
        case 'minecraft:condition':
          // on_false — предмет не используется, обычное состояние в слоте.
          walk(node.on_false ?? node.on_true)
          return
        case 'minecraft:range_dispatch':
          walk(node.fallback ?? node.entries?.[0]?.model)
          return
        case 'minecraft:special':
          special ??= { base: node.base, special: node.model?.type ?? 'unknown' }
          return
        default:
          // bundle/selected_item и прочие обёртки — пробуем их запасные ветки.
          walk(node.fallback ?? node.model ?? node.base)
      }
    }

    walk(def.model)
    if (collected.length > 0) return { kind: 'model', models: collected }
    if (special !== null) return { kind: 'special', ...(special as Special) }
    return { kind: 'missing' }
  }

  /** Разворачивает цепочку `parent` в одну модель. */
  resolveModel(ref: string): ResolvedModel | null {
    const cached = this.modelCache.get(ref)
    if (cached !== undefined) return cached

    const chain: any[] = []
    let current: string | undefined = ref
    const seen = new Set<string>()

    while (current) {
      const path = current.replace(/^minecraft:/, '')
      if (path.startsWith('builtin/')) break
      if (seen.has(path)) break
      seen.add(path)
      const json = this.readJson(`models/${path}.json`)
      if (!json) break
      chain.push(json)
      current = json.parent
    }

    if (chain.length === 0) {
      this.modelCache.set(ref, null)
      return null
    }

    const builtin: ResolvedModel['builtin'] = current?.includes('builtin/generated')
      ? 'generated'
      : current?.includes('builtin/entity')
        ? 'entity'
        : null

    // От предка к потомку: потомок переопределяет.
    const textures: Record<string, string> = {}
    const display: Record<string, DisplayTransform> = {}
    let elements: ModelElement[] = []
    let guiLight: 'front' | 'side' = 'side'

    for (const model of chain.reverse()) {
      Object.assign(textures, model.textures ?? {})
      for (const [ctx, t] of Object.entries(model.display ?? {})) {
        display[ctx] = { ...display[ctx], ...(t as DisplayTransform) }
      }
      if (model.elements) elements = model.elements
      if (model.gui_light) guiLight = model.gui_light
    }

    const resolved: ResolvedModel = {
      builtin,
      textures: resolveTextureRefs(textures),
      elements,
      display,
      guiLight,
    }
    this.modelCache.set(ref, resolved)
    return resolved
  }
}

/**
 * Раскрывает ссылки вида "#all" внутри карты текстур.
 * Значение может быть строкой или объектом {sprite, force_translucent} —
 * вторая форма появилась для витражей и подобных полупрозрачных блоков.
 */
function resolveTextureRefs(textures: Record<string, unknown>): Record<string, string> {
  const sprite = (v: unknown): string =>
    typeof v === 'string' ? v : ((v as { sprite?: string } | null)?.sprite ?? '')
  const out: Record<string, string> = {}
  for (const key of Object.keys(textures)) {
    let value = sprite(textures[key])
    for (let hops = 0; value.startsWith('#') && hops < 8; hops++) {
      const next = textures[value.slice(1)]
      if (next === undefined) break
      value = sprite(next)
    }
    out[key] = value
  }
  return out
}
