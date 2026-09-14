/**
 * Дерево варки зелий.
 *
 * Брожение — одна из немногих механик, которую Mojang так и не сделала
 * data-driven: смеси заданы прямо в коде игры (PotionBrewing). Поэтому граф
 * ведётся здесь вручную, но каждый ингредиент и каждый эффект сверяются
 * при сборке с реестром версии — если Mojang что-то переименует, сборка упадёт.
 */

export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

/** Шаг варки: что стояло в колбе, что положили сверху, что получилось. */
export interface BrewStep {
  from: string
  ingredient: string
  to: string
}

/** Идентификатор зелья: эффект плюс необязательные приставки long_/strong_. */
export const WATER = 'water'
export const AWKWARD = 'awkward'

/** Основы: что получается из бутылки воды. */
export const BASE_STEPS: BrewStep[] = [
  { from: WATER, ingredient: 'nether_wart', to: AWKWARD },
  { from: WATER, ingredient: 'redstone', to: 'mundane' },
  { from: WATER, ingredient: 'glowstone_dust', to: 'thick' },
  { from: WATER, ingredient: 'fermented_spider_eye', to: 'weakness' },
]

/** Основные зелья: мутное зелье плюс профильный ингредиент. */
export const EFFECT_STEPS: BrewStep[] = [
  { from: AWKWARD, ingredient: 'sugar', to: 'swiftness' },
  { from: AWKWARD, ingredient: 'rabbit_foot', to: 'leaping' },
  { from: AWKWARD, ingredient: 'blaze_powder', to: 'strength' },
  { from: AWKWARD, ingredient: 'glistering_melon_slice', to: 'healing' },
  { from: AWKWARD, ingredient: 'spider_eye', to: 'poison' },
  { from: AWKWARD, ingredient: 'ghast_tear', to: 'regeneration' },
  { from: AWKWARD, ingredient: 'magma_cream', to: 'fire_resistance' },
  { from: AWKWARD, ingredient: 'pufferfish', to: 'water_breathing' },
  { from: AWKWARD, ingredient: 'golden_carrot', to: 'night_vision' },
  { from: AWKWARD, ingredient: 'turtle_helmet', to: 'turtle_master' },
  { from: AWKWARD, ingredient: 'phantom_membrane', to: 'slow_falling' },
  { from: AWKWARD, ingredient: 'breeze_rod', to: 'wind_charged' },
  { from: AWKWARD, ingredient: 'slime_block', to: 'oozing' },
  { from: AWKWARD, ingredient: 'stone', to: 'infested' },
  { from: AWKWARD, ingredient: 'cobweb', to: 'weaving' },
]

/** Какие зелья продлеваются красной пылью. */
export const EXTENDABLE = [
  'night_vision', 'invisibility', 'fire_resistance', 'leaping', 'slowness', 'swiftness',
  'turtle_master', 'slow_falling', 'water_breathing', 'poison', 'regeneration', 'strength',
  'weakness', 'wind_charged', 'oozing', 'infested', 'weaving',
]

/** Какие зелья усиливаются светопылью. */
export const UPGRADABLE = [
  'leaping', 'slowness', 'swiftness', 'turtle_master', 'healing', 'harming',
  'poison', 'regeneration', 'strength',
]

/** Порча перебродившим паучьим глазом: во что превращается зелье. */
export const CORRUPTIONS: Record<string, string> = {
  night_vision: 'invisibility',
  swiftness: 'slowness',
  leaping: 'slowness',
  healing: 'harming',
  poison: 'harming',
}

/** Превращение зелья в другую форму — эти шаги делаются тем же ингредиентом для любого зелья. */
export const FORMS: { ingredient: string; from: 'potion' | 'splash_potion'; to: string; note: string }[] = [
  { ingredient: 'gunpowder', from: 'potion', to: 'splash_potion', note: 'splash' },
  { ingredient: 'dragon_breath', from: 'splash_potion', to: 'lingering_potion', note: 'lingering' },
]

/** Топливо варочной стойки. */
export const FUEL = 'blaze_powder'
