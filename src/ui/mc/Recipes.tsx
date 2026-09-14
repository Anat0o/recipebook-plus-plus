/**
 * Отрисовка источников получения в виде ванильных GUI.
 * Каждый вид источника — свой экран из игры: сетка верстака, печь, камнерез,
 * кузнечный стол, строка сделки, карточка выпадения.
 */
import type { Ingredient, Source, Stack } from '../../lib/schema.ts'
import { useApp } from '../../app/context.tsx'
import { conditionLabel, itemName, sourceNote } from '../../i18n/index.ts'
import { originIcon, originLabel } from '../../lib/origins.ts'
import { romanize } from './controls.tsx'
import { Arrow, Slot } from './Sprite.tsx'
import { IngredientSlot } from './Ingredient.tsx'

export interface LootControls {
  fortune: number
  looting: number
  killedByPlayer: boolean
}

export function RecipeCard({ source, controls }: { source: Source; controls: LootControls }): React.ReactElement {
  switch (source.kind) {
    case 'craft':
      return <CraftingRecipe source={source} />
    case 'cook':
      return <CookingRecipe source={source} />
    case 'stonecut':
      return <SimpleRecipe input={source.ingredient} result={source.result} />
    case 'transmute':
      return <TransmuteRecipe source={source} />
    case 'smith':
      return <SmithingRecipe source={source} />
    case 'dynamic':
      return <DynamicRecipe source={source} />
    case 'trade':
      return <TradeRecipe source={source} />
    case 'hardcoded':
      return <HardcodedSource source={source} />
    case 'loot':
      return <LootRecipe source={source} controls={controls} />
  }
}

function CraftingRecipe({ source }: { source: Source & { kind: 'craft' } }): React.ReactElement {
  const { openItem } = useApp()
  return (
    <div className="recipe">
      <div
        className="mc-grid"
        style={{ gridTemplateColumns: `repeat(${source.width}, auto)` }}
        role="group"
      >
        {source.grid.map((ingredient, i) => (
          <IngredientSlot key={i} ingredient={ingredient} />
        ))}
      </div>
      <Arrow />
      <Slot id={source.result.id} count={source.result.count} size={52} onOpen={openItem} />
    </div>
  )
}

function CookingRecipe({ source }: { source: Source & { kind: 'cook' } }): React.ReactElement {
  const { openItem, t } = useApp()
  return (
    <div className="recipe">
      <Slot id={source.station} size={44} onOpen={openItem} />
      <div className="recipe__furnace">
        <IngredientSlot ingredient={source.ingredient} />
        <span className="furnace-flame" aria-hidden />
        {source.station === 'campfire' ? null : <Slot id={FUEL_ICON} size={44} title={t.brewFuel} />}
      </div>
      <Arrow progress />
      <Slot id={source.result.id} count={source.result.count} size={52} onOpen={openItem} />
      <dl className="recipe__meta">
        <div>
          <dt>{t.experience}</dt>
          <dd>{source.xp.toFixed(2).replace(/\.?0+$/, '')}</dd>
        </div>
        <div>
          <dt>{t.time}</dt>
          <dd>
            {(source.time / 20).toFixed(0)} {t.seconds}
          </dd>
        </div>
      </dl>
    </div>
  )
}

const FUEL_ICON = 'coal'

function SimpleRecipe({ input, result }: { input: Ingredient; result: Stack }): React.ReactElement {
  const { openItem } = useApp()
  return (
    <div className="recipe">
      <IngredientSlot ingredient={input} />
      <Arrow />
      <Slot id={result.id} count={result.count} size={52} onOpen={openItem} />
    </div>
  )
}

function TransmuteRecipe({ source }: { source: Source & { kind: 'transmute' } }): React.ReactElement {
  const { openItem } = useApp()
  return (
    <div className="recipe">
      <IngredientSlot ingredient={source.input} />
      <IngredientSlot ingredient={source.material} />
      <Arrow />
      <Slot id={source.result.id} count={source.result.count} size={52} onOpen={openItem} />
    </div>
  )
}

function SmithingRecipe({ source }: { source: Source & { kind: 'smith' } }): React.ReactElement {
  const { openItem, t } = useApp()
  return (
    <div className="recipe">
      <IngredientSlot ingredient={source.template} />
      <IngredientSlot ingredient={source.base} />
      <IngredientSlot ingredient={source.addition} />
      <Arrow />
      {source.result ? (
        <Slot id={source.result.id} size={52} onOpen={openItem} />
      ) : (
        <span className="recipe__note">{t.groupSmith}</span>
      )}
    </div>
  )
}

function DynamicRecipe({ source }: { source: Source & { kind: 'dynamic' } }): React.ReactElement {
  const { openItem } = useApp()
  return (
    <div className="recipe">
      <span className="recipe__note mc-font">{describeDynamic(source.recipeType)}</span>
      {source.result ? (
        <>
          <Arrow />
          <Slot id={source.result.id} size={52} onOpen={openItem} />
        </>
      ) : null}
    </div>
  )
}

const DYNAMIC_LABELS: Record<string, string> = {
  crafting_special_bannerduplicate: 'Копирование знамени: знамя + чистое знамя того же цвета',
  crafting_special_bookcloning: 'Копирование книги: подписанная книга + книга с пером',
  crafting_special_firework_rocket: 'Ракета: бумага + порох (до 3) + звёзды фейерверка',
  crafting_special_firework_star: 'Звезда фейерверка: порох + краситель + модификатор формы',
  crafting_special_firework_star_fade: 'Затухание звезды: звезда фейерверка + краситель',
  crafting_special_mapextending: 'Расширение карты: карта + 8 листов бумаги',
  crafting_special_repairitem: 'Починка: два одинаковых повреждённых предмета',
  crafting_special_shielddecoration: 'Щит с узором: щит + знамя',
  crafting_decorated_pot: 'Горшок: 4 черепка или кирпича',
  crafting_dye: 'Окрашивание: предмет + краситель',
  crafting_imbue: 'Насыщение: предмет + материал',
}

function describeDynamic(type: string): string {
  return DYNAMIC_LABELS[type] ?? type.replaceAll('_', ' ')
}

function HardcodedSource({ source }: { source: Source & { kind: 'hardcoded' } }): React.ReactElement {
  const { openItem, lang } = useApp()
  return (
    <div className="recipe">
      {source.icon ? <Slot id={source.icon} onOpen={openItem} /> : null}
      <span className="recipe__note">{sourceNote(source.note, lang)}</span>
      <Arrow />
      <Slot id={source.result.id} size={52} onOpen={openItem} />
    </div>
  )
}

function TradeRecipe({ source }: { source: Source & { kind: 'trade' } }): React.ReactElement {
  const { openItem, t } = useApp()
  return (
    <div className="recipe">
      <div className="recipe__cost">
        {source.cost.map((stack, i) => (
          <Slot key={i} id={stack.id} count={source.dynamicCost && i === 0 ? 0 : stack.count} onOpen={openItem} />
        ))}
      </div>
      <Arrow />
      <Slot id={source.result.id} count={source.result.count} size={52} onOpen={openItem} />
      <dl className="recipe__meta">
        <div>
          <dt>{t.tradeLevel}</dt>
          <dd>{source.level}</dd>
        </div>
        {source.maxUses ? (
          <div>
            <dt>{t.tradeUses}</dt>
            <dd>{source.maxUses}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function LootRecipe({
  source,
  controls,
}: {
  source: Source & { kind: 'loot' }
  controls: LootControls
}): React.ReactElement {
  const { openItem, byId, lang, t, entityNames } = useApp()

  const byLevel = source.byLevel
  const level = byLevel?.enchantment === 'fortune' ? controls.fortune : controls.looting
  const blocked = source.conditions.includes('killed_by_player') && !controls.killedByPlayer

  const at = (index: number): { chance: number; expected: number } =>
    blocked
      ? { chance: 0, expected: 0 }
      : {
          chance: byLevel?.chance[index] ?? source.chance,
          expected: byLevel?.expected[index] ?? source.expected,
        }

  // Базовый шанс виден всегда; шанс с максимальным уровнем зачарования — рядом,
  // чтобы не двигать слайдер ради самого частого вопроса. Слайдер остаётся для
  // промежуточных уровней и подсвечивает тот столбец, который сейчас выбран.
  const base = at(0)
  const maxIndex = byLevel ? byLevel.chance.length - 1 : 0
  const boosted = byLevel ? at(maxIndex) : null
  const current = at(level)
  const boostedLabel = byLevel?.enchantment === 'fortune' ? t.withFortune : t.withLooting

  const icon = originIcon(source.context, source.origin, (id) => byId.has(id))
  const label = originLabel(source.context, source.origin, lang, entityNames, (id) => {
    const entry = byId.get(id)
    return entry ? itemName(entry.names, lang, id) : null
  })

  return (
    <div className={`recipe recipe--loot${blocked ? ' recipe--blocked' : ''}`}>
      <div className="recipe__origin">
        {icon ? <Slot id={icon} onOpen={openItem} title={label} /> : <span className="recipe__origin-mark" />}
        <span className="recipe__origin-name">{label}</span>
      </div>
      <Arrow />
      <Slot id={source.result.id} size={52} onOpen={openItem} />
      <dl className="recipe__meta">
        <div className={level === 0 ? 'is-current' : undefined}>
          <dt>{t.chance}</dt>
          <dd className="recipe__chance">{formatChance(base.chance)}</dd>
          {showAverage(base) ? <dd className="recipe__average">{formatCount(base.expected)}</dd> : null}
        </div>
        {boosted ? (
          <div className={level === maxIndex ? 'is-current' : undefined}>
            <dt>{boostedLabel}</dt>
            <dd className="recipe__chance">{formatChance(boosted.chance)}</dd>
            {showAverage(boosted) ? <dd className="recipe__average">{formatCount(boosted.expected)}</dd> : null}
          </div>
        ) : null}
        {boosted && level > 0 && level < maxIndex ? (
          <div className="is-current">
            <dt>{boostedLabel.replace(/ III$/, ` ${romanize(level)}`)}</dt>
            <dd className="recipe__chance">{formatChance(current.chance)}</dd>
            {showAverage(current) ? <dd className="recipe__average">{formatCount(current.expected)}</dd> : null}
          </div>
        ) : null}
      </dl>
      {source.conditions.length > 0 ? (
        <ul className="recipe__conditions">
          {source.conditions.map((condition) => (
            <li key={condition}>{conditionLabel(condition, lang)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Среднее количество показываем, только если оно говорит больше, чем сам шанс. */
function showAverage({ chance, expected }: { chance: number; expected: number }): boolean {
  return expected > 0 && Math.abs(expected - chance) > 1e-6
}

function formatCount(value: number): string {
  return `×${value.toFixed(2).replace(/\.?0+$/, '')}`
}

export function formatChance(chance: number): string {
  if (chance <= 0) return '0 %'
  if (chance >= 1) return '100 %'
  const percent = chance * 100
  if (percent < 0.1) return `${percent.toFixed(3)} %`
  if (percent < 10) return `${percent.toFixed(1)} %`
  return `${percent.toFixed(0)} %`
}
