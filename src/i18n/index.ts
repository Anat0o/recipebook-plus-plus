/**
 * Строки интерфейса. Названия предметов сюда не входят — они приходят
 * из официальных языковых файлов игры вместе с данными версии.
 */
export type Lang = 'ru' | 'en'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

const RU = {
  appName: 'RecipeBook++',
  tabSearch: 'Поиск',
  tabCatalog: 'Каталог',
  tabStations: 'Станции',
  tabFavorites: 'Избранное',
  tabVillagers: 'Жители',

  searchPlaceholder: 'Предметы, блоки, пластинки',
  searchHint: 'Найдите предмет, чтобы увидеть все способы его получить',
  searchEmpty: 'Ничего не нашлось',
  searchEmptyHint: 'Попробуйте английское название или идентификатор',
  clearSearch: 'Очистить поиск',
  showMore: 'Показать ещё',

  sectionObtain: 'Получение',
  sectionUses: 'Использование',
  sectionProps: 'Свойства',

  groupCraft: 'Верстак',
  groupCook: 'Переплавка',
  groupStonecut: 'Камнерез',
  groupSmith: 'Кузнечный стол',
  groupTransmute: 'Перекрашивание',
  groupDynamic: 'Особые рецепты',
  groupBlock: 'Из блоков',
  groupEntity: 'С существ',
  groupChest: 'Сундуки и структуры',
  groupGameplay: 'Рыбалка, бартер и прочее',
  groupArchaeology: 'Археология',
  groupTrade: 'Торговля',
  groupSpecial: 'Особые способы',
  groupOther: 'Прочее',

  usedAsIngredient: 'Ингредиент',
  usedAsBase: 'Основа',
  usedAsTemplate: 'Шаблон',
  usedAsAddition: 'Добавка',
  usedAsMaterial: 'Материал',
  usedAsCost: 'Цена',

  chance: 'Шанс',
  average: 'В среднем',
  perDrop: 'за одно выпадение',
  fortune: 'Удача',
  looting: 'Добыча',
  killedByPlayer: 'Убит игроком',
  silkTouch: 'Шёлковое касание',
  level: 'Уровень',
  experience: 'Опыт',
  seconds: 'с',
  maxUses: 'сделок до восполнения',
  tradeLevel: 'Уровень жителя',

  noSources: 'Способы получения не найдены — предмет доступен только в творческом режиме или через команды.',
  noUses: 'Предмет ни в чём не используется.',
  approxIcon: 'Иконка приблизительная: в игре предмет рисуется отдельным кодом.',
  tradesUnavailable: 'В этой версии сделки жителей зашиты в код игры, поэтому раздел недоступен.',

  brewBases: 'Основы',
  brewEffects: 'Основные зелья',
  brewModifiers: 'Изменение зелья',
  brewExtend: 'Продлить действие',
  brewUpgrade: 'Усилить действие',
  brewCorrupt: 'Испортить эффект',
  brewForms: 'Другая форма',
  brewFuel: 'Топливо',
  brewNote: 'Варка — одна из немногих механик, не описанных данными игры: смеси зашиты в код. Дерево ниже ведётся вручную и сверяется с реестром версии при сборке.',
  enchantMaxLevel: 'Макс. уровень',
  enchantAnvil: 'Цена на наковальне',
  enchantWeight: 'Вес при выпадении',
  enchantTreasure: 'Только из сокровищ',
  enchantConflicts: 'Несовместимо с',
  enchantAppliesTo: 'Применимо к',
  enchantNote: 'Список и уровни читаются из данных игры. Сколько уровней опыта запросит конкретный слот стола — считает код игры, здесь этого нет.',
  step: 'Шаг',
  stepFinal: 'Готовый результат',
  of: 'из',
  build3d: 'Постройка',
  build3dHint: 'Потяните, чтобы повернуть. Щипок или колесо — приближение, двойное нажатие возвращает вид.',
  build3dUnavailable:
    'Браузер не смог показать трёхмерную модель. Список блоков шага ниже остаётся полным.',
  time: 'Время',
  tradeUses: 'Сделок',
  tabFarms: 'Автофермы',
  tabRedstone: 'Редстоун',
  searchResults: 'Найдено',
  catalogGroup: 'Каталог',
  showCommandOnly: 'Предметы только из команд',
  showCommandOnlyNote:
    'Скрыто {n} предметов, которые нельзя получить в игре: яйца призыва, барьеры, командные блоки.',
  selfDropOnly: 'Добывается разрушением блока',
  multiblocks: 'Постройки',
  materials: 'Понадобится',
  guideSteps: 'Порядок сборки',
  guideNotes: 'Что важно знать',
  layer: 'Уровень',
  editionJava: 'Java',
  editionBedrock: 'Bedrock',
  editionBoth: 'Java и Bedrock',
  farmsHint: 'Схемы собраны из иконок блоков этой версии. Каждый уровень — отдельный слой по высоте.',
  redstoneHint: 'Базовые узлы, из которых собирается всё остальное. Слои идут снизу вверх.',
  offline: 'Оффлайн',
  offlineDownload: 'Загрузить версию для оффлайна',
  offlineWarning:
    'Браузер может удалить загруженные данные: и iOS, и Android вытесняют их при нехватке места или после долгого простоя. Копия не вечная — при случае обновите её.',
  offlineDone: 'Загружено',
  offlineWorking: 'Загружаем…',
  offlineFailed: 'Не получилось загрузить',
  offlineUnsupported: 'Браузер не поддерживает оффлайн-режим',
  offlinePersisted: 'Браузер согласился хранить данные постоянно.',
  offlineNotPersisted: 'Браузер не дал постоянного хранения — данные могут пропасть.',
  loomNote: 'Ткацкий станок добавляет по одному слою за раз: баннер, краситель и, для десяти узоров, предмет-образец. Больше шести слоёв игра на баннере не сохраняет.',
  loomDesigns: 'Готовые баннеры',
  loomPatterns: 'Все узоры',
  loomSteps: 'Последовательность',
  loomStart: 'Начните с баннера этого цвета',
  loomLayers: 'сл.',
  loomDyeOnly: 'только краситель',
  smithingTrimNote: 'Выберите материал отделки. Сначала каждый узор показан на полном незеритовом комплекте; откройте узор, чтобы сравнить его на всех доступных видах брони.',
  smithingTrimMaterial: 'Материал и цвет отделки',
  smithingTrimPatterns: 'Готовые комплекты с отделкой',
  smithingTrimNetherite: 'Все узоры показаны на незеритовой броне.',
  smithingTrimArmor: 'Тот же узор и материал на полных комплектах брони.',
  smithingTrimAll: 'Все узоры',
  smithingTrimLoadError: 'Не удалось загрузить текстуры отделки брони.',
  beaconPyramids: 'Пирамиды маяка',
  beaconPyramidsHint: 'Выберите уровень, чтобы рассмотреть полную пирамиду. Каждый следующий уровень сохраняет верхние слои и добавляет новое основание.',
  beaconTier: 'Уровень',
  beaconBlocks: 'блоков',
  beaconBase: 'основание',
  beaconValidBlocks: 'Слои можно собирать вперемешку из блоков железа, золота, изумруда, алмаза и незерита.',
  stationRecipes: 'Рецепты: {n}',
  showStationRecipes: 'Показать рецепты',
  hideStationRecipes: 'Скрыть рецепты',
  withLooting: 'С Добычей III',
  withFortune: 'С Удачей III',
  version: 'Версия',
  language: 'Язык',
  settings: 'Настройки',
  loading: 'Загрузка…',
  back: 'Назад',
  close: 'Закрыть',
  anyOf: 'любой из',
  retry: 'Повторить',
  versionLoadError: 'Не удалось загрузить данные версии.',
  villagerLoadError: 'Не удалось загрузить жителей.',
  villagersHint: 'Профессии, рабочие блоки и все возможные предложения.',
  villagerSearch: 'Поиск жителей и сделок',
  villagerSearchPlaceholder: 'Профессия, блок или предмет',
  villagerSearchEmpty: 'Жители и сделки по такому запросу не найдены.',
  noJobBlock: 'Без рабочего блока',
  offers: 'вариантов',
  allVillagers: 'Все жители',
  jobBlock: 'Рабочий блок',
  noJobOrTrades: 'Рабочего блока и торговли нет.',
  variants: 'Облики',
  levelWord: 'уровень',
  gamePicks: 'Игра выбирает {picks} из {total}',
  price: 'Цена',
  dynamicPrice: 'зависит от результата',
  beforeRestock: 'До пополнения',
  reputationDiscount: 'Скидка репутации',
  variantsOnly: 'Только облики',
  result: 'Результат',
  mechanismControls: 'Управление механизмом',
  continuousMotionDisabled: 'Непрерывное движение отключено системной настройкой',
  play: 'Пуск',
  pause: 'Пауза',
  frame: 'Кадр',
  reset: 'Сброс',
  cutaway: 'Разрез',
  speed: 'Скорость',
  tick: 'такт',
  state: 'Состояние',
  running: 'выполняется',
  paused: 'пауза',
  schematicEntities: 'Сущности в схеме',
  containerContents: 'Содержимое контейнеров',
  sections: 'Разделы',
  disclaimer: 'Неофициальный фанатский справочник. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.',
}

const EN: typeof RU = {
  appName: 'RecipeBook++',
  tabSearch: 'Search',
  tabCatalog: 'Catalog',
  tabStations: 'Stations',
  tabFavorites: 'Favorites',
  tabVillagers: 'Villagers',

  searchPlaceholder: 'Items, blocks, music discs',
  searchHint: 'Find an item to see every way to get it',
  searchEmpty: 'Nothing found',
  searchEmptyHint: 'Try the Russian name or the identifier',
  clearSearch: 'Clear search',
  showMore: 'Show more',

  sectionObtain: 'Obtaining',
  sectionUses: 'Used in',
  sectionProps: 'Properties',

  groupCraft: 'Crafting table',
  groupCook: 'Smelting',
  groupStonecut: 'Stonecutter',
  groupSmith: 'Smithing table',
  groupTransmute: 'Recoloring',
  groupDynamic: 'Special recipes',
  groupBlock: 'From blocks',
  groupEntity: 'From mobs',
  groupChest: 'Chests and structures',
  groupGameplay: 'Fishing, bartering and more',
  groupArchaeology: 'Archaeology',
  groupTrade: 'Trading',
  groupSpecial: 'Special ways',
  groupOther: 'Other',

  usedAsIngredient: 'Ingredient',
  usedAsBase: 'Base',
  usedAsTemplate: 'Template',
  usedAsAddition: 'Addition',
  usedAsMaterial: 'Material',
  usedAsCost: 'Price',

  chance: 'Chance',
  average: 'Average',
  perDrop: 'per drop',
  fortune: 'Fortune',
  looting: 'Looting',
  killedByPlayer: 'Killed by player',
  silkTouch: 'Silk Touch',
  level: 'Level',
  experience: 'XP',
  seconds: 's',
  maxUses: 'trades before restock',
  tradeLevel: 'Villager level',

  noSources: 'No ways to obtain — this item is creative-only or command-only.',
  noUses: 'This item is not used in anything.',
  approxIcon: 'Approximate icon: the game draws this item with dedicated code.',
  tradesUnavailable: 'In this version villager trades are hardcoded, so this section is unavailable.',

  brewBases: 'Bases',
  brewEffects: 'Effect potions',
  brewModifiers: 'Modifying a potion',
  brewExtend: 'Extend duration',
  brewUpgrade: 'Strengthen effect',
  brewCorrupt: 'Corrupt effect',
  brewForms: 'Other form',
  brewFuel: 'Fuel',
  brewNote: 'Brewing is one of the few mechanics not described by game data — the mixes are hardcoded. The tree below is maintained by hand and validated against the version registry at build time.',
  enchantMaxLevel: 'Max level',
  enchantAnvil: 'Anvil cost',
  enchantWeight: 'Drop weight',
  enchantTreasure: 'Treasure only',
  enchantConflicts: 'Incompatible with',
  enchantAppliesTo: 'Applies to',
  enchantNote: 'The list and levels come from game data. How many experience levels a given table slot asks for is computed by game code and is not shown here.',
  step: 'Step',
  stepFinal: 'Finished build',
  of: 'of',
  build3d: 'Build',
  build3dHint: 'Drag to rotate. Pinch or scroll to zoom, double-tap resets the view.',
  build3dUnavailable:
    'The browser could not show the 3D model. The block list for this step below is complete.',
  time: 'Time',
  tradeUses: 'Uses',
  tabFarms: 'Farms',
  tabRedstone: 'Redstone',
  searchResults: 'Found',
  catalogGroup: 'Catalogue',
  showCommandOnly: 'Command-only items',
  showCommandOnlyNote:
    '{n} items you cannot obtain in game are hidden: spawn eggs, barriers, command blocks.',
  selfDropOnly: 'Obtained by breaking the block',
  multiblocks: 'Structures',
  materials: 'You will need',
  guideSteps: 'Build order',
  guideNotes: 'Worth knowing',
  layer: 'Layer',
  editionJava: 'Java',
  editionBedrock: 'Bedrock',
  editionBoth: 'Java and Bedrock',
  farmsHint: 'Schematics are drawn with this version’s block icons. Each level is one layer of height.',
  redstoneHint: 'The basic nodes everything else is built from. Layers go bottom to top.',
  offline: 'Offline',
  offlineDownload: 'Download this version for offline use',
  offlineWarning:
    'The browser may delete downloaded data: both iOS and Android evict it when storage runs low or after long disuse. The copy is not permanent — refresh it now and then.',
  offlineDone: 'Downloaded',
  offlineWorking: 'Downloading…',
  offlineFailed: 'Download failed',
  offlineUnsupported: 'This browser has no offline support',
  offlinePersisted: 'The browser agreed to keep the data permanently.',
  offlineNotPersisted: 'The browser refused permanent storage — the data may vanish.',
  loomNote: 'A loom adds one layer at a time: a banner, a dye and — for ten patterns — a pattern item. The game keeps at most six layers on a banner.',
  loomDesigns: 'Ready-made banners',
  loomPatterns: 'All patterns',
  loomSteps: 'Step by step',
  loomStart: 'Start with a banner of this colour',
  loomLayers: 'layers',
  loomDyeOnly: 'dye only',
  smithingTrimNote: 'Choose a trim material. Every pattern is first shown on a full netherite set; open one to compare it across every available armor type.',
  smithingTrimMaterial: 'Trim material and colour',
  smithingTrimPatterns: 'Finished trimmed sets',
  smithingTrimNetherite: 'Every pattern is shown on netherite armor.',
  smithingTrimArmor: 'The same pattern and material on complete armor sets.',
  smithingTrimAll: 'All patterns',
  smithingTrimLoadError: 'Could not load armor trim textures.',
  beaconPyramids: 'Beacon pyramids',
  beaconPyramidsHint: 'Select a tier to inspect the complete pyramid. Each new tier keeps the upper layers and adds a wider base.',
  beaconTier: 'Tier',
  beaconBlocks: 'blocks',
  beaconBase: 'base',
  beaconValidBlocks: 'Layers may freely mix iron, gold, emerald, diamond and netherite blocks.',
  stationRecipes: 'Recipes: {n}',
  showStationRecipes: 'Show recipes',
  hideStationRecipes: 'Hide recipes',
  withLooting: 'With Looting III',
  withFortune: 'With Fortune III',
  version: 'Version',
  language: 'Language',
  settings: 'Settings',
  loading: 'Loading…',
  back: 'Back',
  close: 'Close',
  anyOf: 'any of',
  retry: 'Retry',
  versionLoadError: 'Could not load version data.',
  villagerLoadError: 'Could not load villagers.',
  villagersHint: 'Professions, job blocks and every possible offer.',
  villagerSearch: 'Search villagers and trades',
  villagerSearchPlaceholder: 'Profession, block or item',
  villagerSearchEmpty: 'No villagers or trades match this search.',
  noJobBlock: 'No job block',
  offers: 'offers',
  allVillagers: 'All villagers',
  jobBlock: 'Job block',
  noJobOrTrades: 'No job block or profession trades.',
  variants: 'Variants',
  levelWord: 'level',
  gamePicks: 'The game picks {picks} of {total}',
  price: 'Price',
  dynamicPrice: 'depends on result',
  beforeRestock: 'Before restock',
  reputationDiscount: 'Reputation discount',
  variantsOnly: 'Variants',
  result: 'Result',
  mechanismControls: 'Mechanism controls',
  continuousMotionDisabled: 'Continuous motion is disabled by system preference',
  play: 'Play',
  pause: 'Pause',
  frame: 'Step',
  reset: 'Reset',
  cutaway: 'Cutaway',
  speed: 'Speed',
  tick: 'tick',
  state: 'State',
  running: 'running',
  paused: 'paused',
  schematicEntities: 'Entities in schematic',
  containerContents: 'Container contents',
  sections: 'Sections',
  disclaimer: 'Unofficial fan reference. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.',
}

export type Strings = typeof RU

const DICTS: Record<Lang, Strings> = { ru: RU, en: EN }

export function strings(lang: Lang): Strings {
  return DICTS[lang]
}

const VILLAGER_LEVELS: Record<Lang, string[]> = {
  ru: ['Новичок', 'Подмастерье', 'Ремесленник', 'Эксперт', 'Мастер'],
  en: ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'],
}

const VILLAGER_VARIANTS: Record<string, Record<Lang, string>> = {
  plains: { ru: 'Равнины', en: 'Plains' }, desert: { ru: 'Пустыня', en: 'Desert' },
  savanna: { ru: 'Саванна', en: 'Savanna' }, taiga: { ru: 'Тайга', en: 'Taiga' },
  snow: { ru: 'Снега', en: 'Snow' }, swamp: { ru: 'Болото', en: 'Swamp' },
  jungle: { ru: 'Джунгли', en: 'Jungle' },
}

export function villagerLevelName(level: number, lang: Lang): string {
  return VILLAGER_LEVELS[lang][level - 1] ?? String(level)
}

export function villagerVariantName(id: string, lang: Lang): string {
  return VILLAGER_VARIANTS[id]?.[lang] ?? id
}

/** Название предмета на выбранном языке с откатом на другой и на идентификатор. */
export function itemName(names: Record<string, string> | undefined, lang: Lang, id: string): string {
  return names?.[lang] ?? names?.en ?? names?.ru ?? id
}

/** Пояснения к способам, зашитым в код игры (tools/curated/special-sources.ts). */
const NOTES_RU: Record<string, string> = {
  wither_drop: 'Выпадает с иссушителя',
  end_ship_frame: 'Лежит в рамке на корабле Энда',
  bottle_dragon_breath: 'Наберите пустой бутылкой облако дыхания дракона',
  bucket_fill: 'Наберите ведром',
  bucket_cow: 'Подоите корову ведром',
  bucket_mob: 'Поймайте существо ведром воды',
  frog_lays: 'Откладывают лягушки',
  chicken_lays: 'Сносят курицы соответствующей окраски',
  worldgen_only: 'Встречается только в генерации мира',
  ominous_vault: 'Зловещее хранилище в испытательных камерах',
}

const NOTES_EN: Record<string, string> = {
  wither_drop: 'Dropped by the Wither',
  end_ship_frame: 'Displayed in an item frame on the End ship',
  bottle_dragon_breath: 'Scoop the dragon breath cloud with an empty bottle',
  bucket_fill: 'Fill a bucket',
  bucket_cow: 'Milk a cow with a bucket',
  bucket_mob: 'Catch the mob with a water bucket',
  frog_lays: 'Laid by frogs',
  chicken_lays: 'Laid by chickens of the matching variant',
  worldgen_only: 'Only generated with the world',
  ominous_vault: 'Ominous vault in trial chambers',
}

const NOTE_DICTS: Record<Lang, Record<string, string>> = { ru: NOTES_RU, en: NOTES_EN }

export function sourceNote(key: string, lang: Lang): string {
  return NOTE_DICTS[lang][key] ?? key
}

/** Условия выпадения приходят из данных ключами — переводим их здесь. */
const CONDITIONS_RU: Record<string, string> = {
  killed_by_player: 'убит игроком',
  silk_touch: 'шёлковое касание',
  tool: 'нужен подходящий инструмент',
  killer: 'зависит от убийцы',
  projectile: 'зависит от снаряда',
  entity_state: 'зависит от состояния существа',
  damage_source: 'зависит от источника урона',
  block_state: 'зависит от состояния блока',
  location: 'зависит от места',
  weather: 'зависит от погоды',
  time: 'зависит от времени суток',
  score: 'зависит от счётчика',
  enchantment_active: 'зависит от активного зачарования',
  extra: 'дополнительное условие',
}

const CONDITIONS_EN: Record<string, string> = {
  killed_by_player: 'killed by a player',
  silk_touch: 'Silk Touch',
  tool: 'requires the right tool',
  killer: 'depends on the killer',
  projectile: 'depends on the projectile',
  entity_state: 'depends on the mob state',
  damage_source: 'depends on the damage source',
  block_state: 'depends on the block state',
  location: 'depends on the location',
  weather: 'depends on the weather',
  time: 'depends on the time of day',
  score: 'depends on a scoreboard value',
  enchantment_active: 'depends on an active enchantment',
  extra: 'additional condition',
}

const CONDITION_DICTS: Record<Lang, Record<string, string>> = { ru: CONDITIONS_RU, en: CONDITIONS_EN }

/**
 * Переводит ключ условия. Составные ключи вида `tool:pickaxes`
 * и отрицания `not:killed_by_player` разбираются отдельно.
 */
export function conditionLabel(key: string, lang: Lang): string {
  if (key.startsWith('not:')) {
    const inner = conditionLabel(key.slice('not:'.length), lang)
    return lang === 'ru' ? `не ${inner}` : `not ${inner}`
  }
  const [head, tail] = splitOnce(key, ':')
  const dict = CONDITION_DICTS[lang]
  const base = dict[head]
  if (!base) return key
  if (tail === undefined) return base
  const detail = tail.replaceAll('_', ' ').replaceAll(',', ', ')
  return `${base}: ${detail}`
}

function splitOnce(value: string, separator: string): [string, string | undefined] {
  const at = value.indexOf(separator)
  return at === -1 ? [value, undefined] : [value.slice(0, at), value.slice(at + 1)]
}
