/**
 * Собирает дерево варки в данные сайта и проверяет его по реестру версии.
 * Незнакомый ингредиент или эффект — ошибка сборки, а не тихо пропавший шаг.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sourceDir } from './fetch-mcmeta.ts'
import { LOCALES } from './config.ts'
import {
  AWKWARD, BASE_STEPS, CORRUPTIONS, EFFECT_STEPS, EXTENDABLE, FORMS, FUEL, UPGRADABLE, WATER,
  type BrewStep,
} from './curated/brewing.ts'

export interface BrewingData {
  fuel: string
  water: string
  awkward: string
  /** Названия зелий по эффекту: код языка → строка. */
  potionNames: Record<string, Record<string, string>>
  base: BrewStep[]
  effects: BrewStep[]
  extendable: string[]
  upgradable: string[]
  corruptions: Record<string, string>
  forms: typeof FORMS
  /** Шаги, выпавшие из дерева: ингредиента или эффекта нет в этой версии. */
  skipped: string[]
}

export function buildBrewing(version: string, knownItems: Set<string>): BrewingData {
  const langDir = join(sourceDir(version, 'assets-json'), 'assets', 'minecraft', 'lang')
  const potionNames: Record<string, Record<string, string>> = {}

  for (const [mcCode, siteCode] of Object.entries(LOCALES)) {
    const dict = JSON.parse(readFileSync(join(langDir, `${mcCode}.json`), 'utf8')) as Record<string, string>
    for (const [key, value] of Object.entries(dict)) {
      const prefix = 'item.minecraft.potion.effect.'
      if (!key.startsWith(prefix)) continue
      const effect = key.slice(prefix.length)
      ;(potionNames[effect] ??= {})[siteCode] = value
    }
  }

  const skipped: string[] = []
  const keep = (steps: BrewStep[]): BrewStep[] =>
    steps.filter((step) => {
      const ok = knownItems.has(step.ingredient) && (step.to in potionNames || step.to === AWKWARD)
      if (!ok) skipped.push(`${step.from} + ${step.ingredient} → ${step.to}`)
      return ok
    })

  const base = keep(BASE_STEPS)
  const effects = keep(EFFECT_STEPS)

  return {
    fuel: FUEL,
    water: WATER,
    awkward: AWKWARD,
    potionNames,
    base,
    effects,
    extendable: EXTENDABLE.filter((effect) => effect in potionNames),
    upgradable: UPGRADABLE.filter((effect) => effect in potionNames),
    corruptions: Object.fromEntries(
      Object.entries(CORRUPTIONS).filter(([from, to]) => from in potionNames && to in potionNames),
    ),
    forms: FORMS.filter((form) => knownItems.has(form.ingredient)),
    skipped,
  }
}
