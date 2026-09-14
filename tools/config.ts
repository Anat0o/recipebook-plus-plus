/** Конфигурация версий Minecraft, которые собирает сайт. */

export interface VersionConfig {
  /** ID версии в mcmeta, он же сегмент URL. */
  id: string
  /** Человекочитаемое имя для переключателя версий. */
  label: string
  /** Отметка последнего релиза — выбирается по умолчанию. */
  latest?: boolean
  /**
   * Торговля с жителями стала data-driven только в 26.x
   * (папки `villager_trade/` и `trade_set/`). Для старых версий используется
   * воспроизводимый снимок из официального server JAR с Mojang mappings.
   */
  dataDrivenTrades: boolean
}

export const VERSIONS: VersionConfig[] = [
  { id: '26.2', label: '26.2 «Chaos Cubed»', latest: true, dataDrivenTrades: true },
  { id: '26.1.2', label: '26.1.2 «Tiny Takeover»', dataDrivenTrades: true },
  { id: '1.21.11', label: '1.21.11', dataDrivenTrades: false },
]

export const DEFAULT_VERSION = VERSIONS.find((v) => v.latest)?.id ?? VERSIONS[0]!.id

/** Языки интерфейса и названий предметов. Ключ — код mcmeta, значение — код сайта. */
export const LOCALES = { en_us: 'en', ru_ru: 'ru' } as const

/** Ветки mcmeta, из которых тянем данные, и нужные из них пути. */
export const MCMETA_SOURCES = {
  'data-json': [
    'data/minecraft/recipe',
    'data/minecraft/loot_table',
    'data/minecraft/enchantment',
    'data/minecraft/tags',
    'data/minecraft/villager_trade',
    'data/minecraft/trade_set',
    'data/minecraft/jukebox_song',
    'data/minecraft/banner_pattern',
    'data/minecraft/trim_material',
    'data/minecraft/trim_pattern',
  ],
  'assets-json': [
    // Только нужные локали — в ветке лежат 143 языка на 82 МБ.
    ...Object.keys(LOCALES).map((code) => `assets/minecraft/lang/${code}.json`),
    // Модели нужны, чтобы отрисовать иконки блоков изометрией (см. tools/render-icons.ts).
    'assets/minecraft/models',
    'assets/minecraft/items',
    // Блоксостояния хранят поворот модели для каждого направления блока —
    // и иногда вовсе другую модель (у воронки вбок это hopper_side).
    // Выписывать это руками значит ошибаться, что и случилось.
    'assets/minecraft/blockstates',
  ],
  atlas: ['all'],
} as const

export type McmetaSource = keyof typeof MCMETA_SOURCES
