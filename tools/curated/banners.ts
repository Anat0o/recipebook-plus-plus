/**
 * Готовые дизайны баннеров с последовательностью для ткацкого станка.
 *
 * Станок добавляет ровно один слой за раз: баннер + краситель (+ образец узора).
 * Дизайн — это цвет основы и список слоёв в порядке нанесения, не длиннее шести:
 * больше слоёв игра на баннере не сохраняет.
 *
 * Список проверяется глазами через tools/preview-banners.ts — в набор попадает
 * только то, что действительно читается как задуманная картинка.
 */

export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

/** Предел числа слоёв на баннере в выживании. */
export const MAX_LAYERS = 6

export interface BannerLayer {
  /** Идентификатор узора из data/minecraft/banner_pattern. */
  pattern: string
  /** Цвет красителя. */
  color: string
}

export interface BannerDesign {
  id: string
  ru: string
  en: string
  /** Цвет самого баннера-основы. */
  base: string
  layers: BannerLayer[]
}

export const BANNER_DESIGNS: BannerDesign[] = [
  {
    id: 'creeper',
    ru: 'Крипер',
    en: 'Creeper',
    base: 'lime',
    layers: [{ pattern: 'creeper', color: 'black' }],
  },
  {
    id: 'jolly_roger',
    ru: 'Весёлый Роджер',
    en: 'Jolly Roger',
    base: 'black',
    layers: [{ pattern: 'skull', color: 'white' }],
  },
  {
    id: 'rising_sun',
    ru: 'Восходящее солнце',
    en: 'Rising Sun',
    base: 'white',
    layers: [{ pattern: 'circle', color: 'red' }],
  },
  {
    id: 'bullseye',
    ru: 'Мишень',
    en: 'Bullseye',
    base: 'white',
    layers: [
      { pattern: 'border', color: 'red' },
      { pattern: 'circle', color: 'red' },
    ],
  },
  {
    id: 'saltire',
    ru: 'Андреевский флаг',
    en: 'Saltire',
    base: 'white',
    layers: [{ pattern: 'cross', color: 'blue' }],
  },
  {
    id: 'hourglass',
    ru: 'Песочные часы',
    en: 'Hourglass',
    base: 'white',
    layers: [
      { pattern: 'triangle_top', color: 'black' },
      { pattern: 'triangle_bottom', color: 'black' },
    ],
  },
  {
    id: 'hazard',
    ru: 'Зубцы',
    en: 'Hazard',
    base: 'yellow',
    layers: [
      { pattern: 'triangles_top', color: 'black' },
      { pattern: 'triangles_bottom', color: 'black' },
    ],
  },
  {
    id: 'chevron',
    ru: 'Шеврон',
    en: 'Chevron',
    base: 'red',
    layers: [{ pattern: 'triangle_bottom', color: 'white' }],
  },
  {
    id: 'holy_cross',
    ru: 'Крест',
    en: 'Cross',
    base: 'white',
    layers: [{ pattern: 'straight_cross', color: 'red' }],
  },
  {
    id: 'rhombus',
    ru: 'Ромб',
    en: 'Lozenge',
    base: 'white',
    layers: [{ pattern: 'rhombus', color: 'cyan' }],
  },
  {
    id: 'flower',
    ru: 'Цветок',
    en: 'Flower',
    base: 'white',
    layers: [{ pattern: 'flower', color: 'red' }],
  },
  {
    id: 'globe',
    ru: 'Глобус',
    en: 'Globe',
    base: 'white',
    layers: [{ pattern: 'globe', color: 'blue' }],
  },
  {
    id: 'mojang',
    ru: 'Логотип Mojang',
    en: 'Mojang Logo',
    base: 'white',
    layers: [{ pattern: 'mojang', color: 'red' }],
  },
  {
    id: 'piglin',
    ru: 'Пиглин',
    en: 'Piglin',
    base: 'white',
    layers: [{ pattern: 'piglin', color: 'pink' }],
  },
  {
    id: 'sunset',
    ru: 'Закат',
    en: 'Sunset',
    base: 'yellow',
    layers: [{ pattern: 'gradient', color: 'red' }],
  },
  {
    id: 'brick_wall',
    ru: 'Кирпичная кладка',
    en: 'Brick Wall',
    base: 'red',
    layers: [{ pattern: 'bricks', color: 'gray' }],
  },
  {
    id: 'flow',
    ru: 'Вихрь',
    en: 'Flow',
    base: 'black',
    layers: [{ pattern: 'flow', color: 'white' }],
  },
  {
    id: 'guster',
    ru: 'Вихревик',
    en: 'Guster',
    base: 'white',
    layers: [{ pattern: 'guster', color: 'gray' }],
  },
  {
    id: 'curly',
    ru: 'Витая кайма',
    en: 'Bordure Indented',
    base: 'white',
    layers: [{ pattern: 'curly_border', color: 'black' }],
  },
]
