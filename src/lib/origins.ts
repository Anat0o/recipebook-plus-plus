/**
 * Названия и иконки источников добычи.
 *
 * Пути таблиц вроде `village/village_armorer` или `trial_chambers/reward_ominous`
 * в языковых файлах игры не переведены, поэтому словарь ведём здесь.
 * Всё, чего в словаре нет, показывается прибранным идентификатором,
 * а не пропадает.
 */
import type { LootContext } from './schema.ts'
import type { Lang } from '../i18n/index.ts'

type Pair = [ru: string, en: string]

const CHESTS: Record<string, Pair> = {
  abandoned_mineshaft: ['Заброшенная шахта', 'Abandoned mineshaft'],
  ancient_city: ['Древний город', 'Ancient city'],
  ancient_city_ice_box: ['Древний город: ледник', 'Ancient city ice box'],
  bastion_bridge: ['Бастион: мост', 'Bastion bridge'],
  bastion_hoglin_stable: ['Бастион: хоглинья конюшня', 'Bastion hoglin stable'],
  bastion_other: ['Бастион: прочее', 'Bastion other'],
  bastion_treasure: ['Бастион: сокровищница', 'Bastion treasure'],
  buried_treasure: ['Зарытое сокровище', 'Buried treasure'],
  desert_pyramid: ['Пустынная пирамида', 'Desert pyramid'],
  end_city_treasure: ['Город Энда: сокровищница', 'End city treasure'],
  igloo_chest: ['Иглу', 'Igloo'],
  jungle_temple: ['Храм в джунглях', 'Jungle temple'],
  jungle_temple_dispenser: ['Храм в джунглях: раздатчик', 'Jungle temple dispenser'],
  nether_bridge: ['Крепость Нижнего мира', 'Nether fortress'],
  pillager_outpost: ['Аванпост разбойников', 'Pillager outpost'],
  ruined_portal: ['Разрушенный портал', 'Ruined portal'],
  shipwreck_map: ['Затонувший корабль: карта', 'Shipwreck map'],
  shipwreck_supply: ['Затонувший корабль: припасы', 'Shipwreck supply'],
  shipwreck_treasure: ['Затонувший корабль: сокровища', 'Shipwreck treasure'],
  simple_dungeon: ['Подземелье', 'Dungeon'],
  spawn_bonus_chest: ['Стартовый сундук', 'Bonus chest'],
  stronghold_corridor: ['Крепость: коридор', 'Stronghold corridor'],
  stronghold_crossing: ['Крепость: перекрёсток', 'Stronghold crossing'],
  stronghold_library: ['Крепость: библиотека', 'Stronghold library'],
  underwater_ruin_big: ['Подводные руины: большие', 'Underwater ruin (big)'],
  underwater_ruin_small: ['Подводные руины: малые', 'Underwater ruin (small)'],
  woodland_mansion: ['Особняк', 'Woodland mansion'],
}

const GAMEPLAY: Record<string, Pair> = {
  armadillo_shed: ['Броненосец сбрасывает чешуйку', 'Armadillo sheds a scute'],
  cat_morning_gift: ['Утренний подарок кошки', 'Cat morning gift'],
  chicken_lay: ['Курица снесла яйцо', 'Chicken lays an egg'],
  fishing: ['Рыбалка', 'Fishing'],
  'fishing/fish': ['Рыбалка: рыба', 'Fishing: fish'],
  'fishing/junk': ['Рыбалка: хлам', 'Fishing: junk'],
  'fishing/treasure': ['Рыбалка: сокровища', 'Fishing: treasure'],
  panda_sneeze: ['Панда чихнула', 'Panda sneeze'],
  piglin_bartering: ['Бартер с пиглином', 'Piglin bartering'],
  sniffer_digging: ['Раскопки нюхача', 'Sniffer digging'],
  turtle_grow: ['Черепашонок вырос', 'Turtle grows up'],
}

const ARCHAEOLOGY: Record<string, Pair> = {
  armadillo: ['Броненосец', 'Armadillo'],
  desert_pyramid: ['Пустынная пирамида', 'Desert pyramid'],
  desert_well: ['Пустынный колодец', 'Desert well'],
  ocean_ruin_cold: ['Холодные подводные руины', 'Cold ocean ruins'],
  ocean_ruin_warm: ['Тёплые подводные руины', 'Warm ocean ruins'],
  trail_ruins_common: ['Тропные руины: обычное', 'Trail ruins: common'],
  trail_ruins_rare: ['Тропные руины: редкое', 'Trail ruins: rare'],
}

const MISC: Record<string, Pair> = {
  beehive: ['Улей', 'Beehive'],
  cave_vine: ['Пещерная лоза', 'Cave vine'],
  sweet_berry_bush: ['Куст сладких ягод', 'Sweet berry bush'],
  'carve/pumpkin': ['Резьба по тыкве', 'Carving a pumpkin'],
  trial_chamber_melee: ['Испытание: ближний бой', 'Trial chamber: melee'],
  trial_chamber_ranged: ['Испытание: дальний бой', 'Trial chamber: ranged'],
}

const PREFIXES: { match: RegExp; ru: string; en: string }[] = [
  { match: /^village\/village_(.+)$/, ru: 'Деревня', en: 'Village' },
  { match: /^trial_chambers?\/(.+)$/, ru: 'Испытательные камеры', en: 'Trial chambers' },
  { match: /^ominous\/trial_chambers?\/(.+)$/, ru: 'Зловещие испытания', en: 'Ominous trial' },
  { match: /^hero_of_the_village\/(.+)$/, ru: 'Дар героя деревни', en: 'Hero of the village gift' },
]

const DETAILS_RU: Record<string, string> = {
  armorer: 'бронник', butcher: 'мясник', cartographer: 'картограф', cleric: 'жрец',
  farmer: 'фермер', fisherman: 'рыбак', fletcher: 'лучник', leatherworker: 'кожевник',
  librarian: 'библиотекарь', mason: 'каменщик', shepherd: 'пастух', toolsmith: 'кузнец инструментов',
  weaponsmith: 'оружейник', tannery: 'кожевня', temple: 'храм', unemployed: 'безработный',
  baby: 'ребёнок', desert_house: 'дом в пустыне', plains_house: 'дом на равнине',
  savanna_house: 'дом в саванне', snowy_house: 'дом в снегах', taiga_house: 'дом в тайге',
  corridor: 'коридор', entrance: 'вход', intersection: 'перекрёсток',
  intersection_barrel: 'бочка на перекрёстке', reward: 'награда', reward_common: 'обычная награда',
  reward_rare: 'редкая награда', reward_unique: 'уникальная награда',
  reward_ominous: 'зловещая награда', reward_ominous_common: 'зловещая обычная награда',
  reward_ominous_rare: 'зловещая редкая награда', reward_ominous_unique: 'зловещая уникальная награда',
  supply: 'припасы', chamber: 'камера', water: 'вода', key: 'ключ',
  consumables: 'расходники', items_to_drop_when_ominous: 'зловещий сброс',
}

export function originLabel(
  context: LootContext,
  origin: string,
  lang: Lang,
  entityNames: Record<string, Record<string, string>>,
  /** Название одноимённого предмета, если такой есть, — для блоков это лучший вариант. */
  itemLabel?: (id: string) => string | null,
): string {
  const index = lang === 'ru' ? 0 : 1

  if (context === 'block') {
    const name = itemLabel?.(origin)
    if (name) return name
  }
  if (context === 'entity') {
    const name = entityNames[origin]?.[lang]
    if (name) return name
  }

  const dict =
    context === 'chest' ? CHESTS
    : context === 'gameplay' ? GAMEPLAY
    : context === 'archaeology' ? ARCHAEOLOGY
    : MISC
  const exact = dict[origin] ?? MISC[origin]
  if (exact) return exact[index]!

  for (const rule of PREFIXES) {
    const found = rule.match.exec(origin)
    if (!found) continue
    const detail = found[1]!
    const head = lang === 'ru' ? rule.ru : rule.en
    const tail = lang === 'ru'
      ? (DETAILS_RU[detail.replace(/_gift$/, '')] ?? prettify(detail))
      : prettify(detail.replace(/_gift$/, ''))
    return `${head}: ${tail}`
  }

  // Составные пути вида `charged_creeper/wither_skeleton` и `sheep/red`:
  // ведущий сегмент — механика, хвост — существо с известным названием.
  const slash = origin.lastIndexOf('/')
  if (slash > 0) {
    const head = origin.slice(0, slash)
    const tail = origin.slice(slash + 1)
    const mobName = entityNames[tail]?.[lang]
    if (mobName) {
      const mechanic =
        head === 'charged_creeper'
          ? (lang === 'ru' ? 'Взрыв заряженного крипера' : 'Charged creeper blast')
          : prettify(head)
      return `${mechanic}: ${mobName}`
    }
  }

  return entityNames[origin]?.[lang] ?? itemLabel?.(origin) ?? prettify(origin)
}

/** Иконка источника: сам предмет, яйцо призыва существа или значок механики. */
export function originIcon(context: LootContext, origin: string, hasItem: (id: string) => boolean): string | null {
  if (hasItem(origin)) return origin

  const tail = origin.slice(origin.lastIndexOf('/') + 1)
  if (hasItem(tail)) return tail
  if (hasItem(`${tail}_spawn_egg`)) return `${tail}_spawn_egg`

  switch (context) {
    case 'chest': return 'chest'
    case 'archaeology': return 'brush'
    case 'shearing': return 'shears'
    case 'spawner': return hasItem('trial_spawner') ? 'trial_spawner' : 'spawner'
    case 'dispenser': return 'dispenser'
    case 'pot': return 'decorated_pot'
    case 'equipment': return 'iron_sword'
    case 'gameplay':
      if (origin.startsWith('fishing')) return 'fishing_rod'
      if (origin.startsWith('piglin')) return 'gold_ingot'
      if (origin.startsWith('hero_of_the_village')) return 'emerald'
      return null
    default:
      return null
  }
}

function prettify(id: string): string {
  const text = id.replaceAll('_', ' ').replaceAll('/', ' → ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
