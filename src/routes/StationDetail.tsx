/**
 * Страницы станций, у которых нет обычных рецептов: варочная стойка и стол
 * зачарований. Обе механики живут в коде игры, поэтому здесь честно сказано,
 * что именно взято из данных, а что описано вручную.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  loadArmorTrims, loadBanners, loadBrewing, loadEnchantments, loadStations,
  type ArmorTrimData, type BannerData, type BannerDesign, type BrewingData, type EnchantmentEntry,
} from '../lib/data.ts'
import { Banner } from '../ui/mc/Banner.tsx'
import { ArmorSet } from '../ui/mc/ArmorSet.tsx'
import { useApp } from '../app/context.tsx'
import { itemName } from '../i18n/index.ts'
import { Arrow, Slot } from '../ui/mc/Sprite.tsx'
import { romanize } from '../ui/mc/controls.tsx'
import { RecipeCard } from '../ui/mc/Recipes.tsx'
import type { Source } from '../lib/schema.ts'
import { useAppBack } from '../lib/back-gesture.ts'
import { BEACON_TIERS, beaconMineralCount, beaconPyramid, type BeaconTier } from '../lib/beacon.ts'
import { Build3d } from '../ui/mc/Build3d.tsx'

export const STATION_PAGES = new Set([
  'crafting_table', 'furnace', 'blast_furnace', 'smoker', 'campfire', 'stonecutter',
  'smithing_table', 'brewing_stand', 'enchanting_table', 'anvil', 'grindstone', 'loom',
  'cartography_table', 'composter', 'beacon',
])

export function StationDetail({ stationId }: { stationId: string }): React.ReactElement {
  const { byId, lang } = useApp()
  const name = itemName(byId.get(stationId)?.names, lang, stationId)

  return (
    <div className="item-detail">
      <header className="item-head">
        <Slot id={stationId} size={56} />
        <div>
          <h2 className="item-head__name">{name}</h2>
          <span className="item-head__id">{stationId}</span>
        </div>
      </header>
      {stationId === 'brewing_stand' ? <BrewingStation /> : null}
      {stationId === 'enchanting_table' ? <EnchantingStation /> : null}
      {stationId === 'loom' ? <LoomStation /> : null}
      {stationId === 'smithing_table' ? <SmithingStation /> : null}
      {stationId === 'beacon' ? <BeaconStation /> : null}
      {!['brewing_stand', 'enchanting_table', 'loom', 'smithing_table', 'beacon'].includes(stationId) ? <GenericStation stationId={stationId} /> : null}
      {stationId === 'smithing_table' ? <GenericStation stationId={stationId} collapsed /> : null}
    </div>
  )
}

function BeaconStation(): React.ReactElement {
  const { t } = useApp()
  const [tier, setTier] = useState<BeaconTier>(1)
  const placements = useMemo(() => beaconPyramid(tier), [tier])
  const steps = useMemo(() => [
    ...Array.from({ length: tier }, (_, layer) => {
      const size = 2 * (tier - layer) + 1
      return {
        ru: `Выложите сплошной слой ${size}×${size} из подходящих минеральных блоков.`,
        en: `Lay a solid ${size}×${size} layer of valid mineral blocks.`,
      }
    }),
    {
      ru: 'Поставьте маяк по центру верхнего слоя. Над ним должно оставаться открытое небо.',
      en: 'Place the beacon in the centre of the top layer. Keep its path to the sky clear.',
    },
  ], [tier])
  const base = tier * 2 + 1

  return (
    <>
      <p className="notice">{t.beaconPyramidsHint}</p>
      <section className="section beacon-pyramids">
        <h3 className="section__title">{t.beaconPyramids}</h3>
        <div className="beacon-pyramids__tiers" role="tablist" aria-label={t.beaconPyramids}>
          {BEACON_TIERS.map((value) => {
            const size = value * 2 + 1
            return (
              <button
                type="button"
                role="tab"
                aria-selected={tier === value}
                className={tier === value ? 'is-selected' : ''}
                onClick={() => setTier(value)}
                key={value}
              >
                <strong>{t.beaconTier} {value}</strong>
                <span>{size}×{size}</span>
                <span>{beaconMineralCount(value)} {t.beaconBlocks}</span>
              </button>
            )
          })}
        </div>
        <Build3d
          placements={placements}
          steps={steps}
          title={`${t.beaconTier} ${tier} · ${t.beaconBase} ${base}×${base} · ${beaconMineralCount(tier)} ${t.beaconBlocks}`}
        />
        <p className="screen__hint">{t.beaconValidBlocks}</p>
      </section>
    </>
  )
}

/** Готовые комплекты: сначала все узоры на незерите, затем выбранный узор на каждой броне. */
function SmithingStation(): React.ReactElement {
  const { version, t, lang, openItem } = useApp()
  const [data, setData] = useState<(ArmorTrimData & { atlasUrl: string }) | null>(null)
  const [failed, setFailed] = useState(false)
  const [material, setMaterial] = useState('')
  const [openPattern, setOpenPattern] = useState<string | null>(null)
  useAppBack(openPattern !== null, () => setOpenPattern(null))

  useEffect(() => {
    let cancelled = false
    setData(null); setFailed(false); setOpenPattern(null)
    loadArmorTrims(version).then((loaded) => {
      if (cancelled) return
      setData(loaded)
      setMaterial(loaded.defaultMaterial)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [version])

  if (failed) return <p className="notice">{t.smithingTrimLoadError}</p>
  if (!data || !material) return <p className="notice">{t.loading}</p>
  const selected = data.patterns.find((pattern) => pattern.id === openPattern) ?? null
  const materialName = data.materials.find((entry) => entry.id === material)?.names[lang] ?? material

  return (
    <>
      <p className="notice">{t.smithingTrimNote}</p>
      <section className="section">
        <h3 className="section__title">{t.smithingTrimMaterial}</h3>
        <div className="trim-materials" role="radiogroup" aria-label={t.smithingTrimMaterial}>
          {data.materials.map((entry) => (
            <button
              type="button"
              role="radio"
              aria-checked={entry.id === material}
              className={`trim-material${entry.id === material ? ' is-selected' : ''}`}
              onClick={() => setMaterial(entry.id)}
              key={entry.id}
            >
              <Slot id={entry.item} size={34} />
              <span>{entry.names[lang]}</span>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <>
          <button type="button" className="mc-button guide-back" onClick={() => setOpenPattern(null)}>
            ← {t.smithingTrimAll}
          </button>
          <section className="section">
            <h3 className="section__title">{selected.names[lang]} · {materialName}</h3>
            <p className="screen__hint">{t.smithingTrimArmor}</p>
            <ul className="armor-gallery armor-gallery--variants">
              {data.armor.map((armor) => {
                const label = `${armor.names[lang]} · ${selected.names[lang]} · ${materialName}`
                return <li key={armor.id}>
                  <button type="button" className="armor-card" onClick={() => openItem(armor.chestplate)}>
                    <ArmorSet data={data} pattern={selected.id} material={material} armor={armor.id} width={54} title={label} />
                    <span className="armor-card__name">{armor.names[lang]}</span>
                  </button>
                </li>
              })}
            </ul>
          </section>
        </>
      ) : (
        <section className="section">
          <h3 className="section__title">{t.smithingTrimPatterns}</h3>
          <p className="screen__hint">{t.smithingTrimNetherite}</p>
          <ul className="armor-gallery">
            {data.patterns.map((pattern) => {
              const label = `${pattern.names[lang]} · ${materialName}`
              return <li key={pattern.id}>
                <button
                  type="button"
                  className="armor-card"
                  onClick={() => setOpenPattern(pattern.id)}
                  aria-expanded={false}
                >
                  <ArmorSet data={data} pattern={pattern.id} material={material} armor={data.defaultArmor} width={50} title={label} />
                  <span className="armor-card__name">{pattern.names[lang]}</span>
                  <Slot id={pattern.template} size={30} />
                </button>
              </li>
            })}
          </ul>
        </section>
      )}
    </>
  )
}

const MECHANICS: Record<string, [string, string]> = {
  anvil: ['Наковальня чинит, переименовывает и объединяет зачарования за уровни опыта; это механика кода, а не JSON-рецепт.', 'An anvil repairs, renames and combines enchantments for XP levels; this is coded behavior, not a JSON recipe.'],
  grindstone: ['Точило чинит два одинаковых предмета и снимает обычные зачарования, возвращая часть опыта.', 'A grindstone repairs two matching items and removes non-curse enchantments, returning some XP.'],
  cartography_table: ['Стол увеличивает, блокирует и копирует карты. Динамические операции перечислены ниже, когда они есть в данных версии.', 'The table scales, locks and copies maps. Dynamic operations are listed below when present in version data.'],
  composter: ['Компостер с вероятностью принимает растительные предметы; после седьмого успешного слоя выдаёт костную муку.', 'A composter probabilistically accepts plant items and yields bone meal after the seventh successful layer.'],
  beacon: ['Маяк получает уровни от пирамиды 3×3, 5×5, 7×7 и 9×9 и применяет выбранный эффект после оплаты минералом.', 'A beacon gains tiers from 3×3, 5×5, 7×7 and 9×9 pyramid layers and applies a chosen effect after mineral payment.'],
}

function GenericStation({ stationId, collapsed = false }: { stationId: string; collapsed?: boolean }): React.ReactElement {
  const { version, lang, t } = useApp()
  const [sources, setSources] = useState<Source[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(!collapsed)
  useEffect(() => {
    let cancelled = false
    setSources(null); setFailed(false); setExpanded(!collapsed)
    loadStations(version).then((data) => { if (!cancelled) setSources(data[stationId] ?? []) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [version, stationId, collapsed])
  if (failed) return <p className="notice">{lang === 'ru' ? 'Не удалось загрузить механику станции.' : 'Could not load station mechanics.'}</p>
  if (!sources) return <p className="notice">{t.loading}</p>
  const note = MECHANICS[stationId]
  return <>
    {note ? <p className="notice">{note[lang === 'ru' ? 0 : 1]}</p> : null}
    {sources.length ? <section className="section">
      <h3 className="section__title">{t.stationRecipes.replace('{n}', String(sources.length))}</h3>
      {collapsed ? <button type="button" className="mc-button station-recipes-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? t.hideStationRecipes : t.showStationRecipes}</button> : null}
      {expanded ? <div className="section__body">{sources.map((source, index) => <RecipeCard key={index} source={source} controls={{ fortune: 0, looting: 0, killedByPlayer: true }} />)}</div> : null}
    </section> : !note ? <p className="notice">{t.noSources}</p> : null}
  </>
}

function BrewingStation(): React.ReactElement {
  const { version, t, lang } = useApp()
  const [data, setData] = useState<BrewingData | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBrewing(version).then((loaded) => {
      if (!cancelled) setData(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  if (!data) return <p className="notice">{t.loading}</p>

  const potion = (effect: string): string => data.potionNames[effect]?.[lang] ?? effect

  return (
    <>
      <p className="notice">{t.brewNote}</p>

      <section className="section">
        <h3 className="section__title">{t.brewFuel}</h3>
        <div className="recipe">
          <Slot id={data.fuel} />
          <span className="recipe__note">
            {lang === 'ru' ? 'Одна щепотка — до 20 варок' : 'One powder fuels up to 20 brews'}
          </span>
          <span className="bubbles" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
        </div>
      </section>

      <BrewSection title={t.brewBases} steps={data.base} potion={potion} baseLabel={() => potion('water')} />
      <BrewSection title={t.brewEffects} steps={data.effects} potion={potion} baseLabel={() => potion('awkward')} />

      <section className="section">
        <h3 className="section__title">{t.brewModifiers}</h3>
        <div className="section__body">
          <ModifierRow ingredient="redstone" label={t.brewExtend} values={data.extendable.map(potion)} />
          <ModifierRow ingredient="glowstone_dust" label={t.brewUpgrade} values={data.upgradable.map(potion)} />
          <ModifierRow
            ingredient="fermented_spider_eye"
            label={t.brewCorrupt}
            values={Object.entries(data.corruptions).map(([from, to]) => `${potion(from)} → ${potion(to)}`)}
          />
          {data.forms.map((form) => (
            <ModifierRow
              key={form.ingredient}
              ingredient={form.ingredient}
              label={t.brewForms}
              values={[form.note === 'splash'
                ? (lang === 'ru' ? 'Взрывное зелье' : 'Splash potion')
                : (lang === 'ru' ? 'Оседающее зелье' : 'Lingering potion')]}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function BrewSection({
  title,
  steps,
  potion,
  baseLabel,
}: {
  title: string
  steps: { from: string; ingredient: string; to: string }[]
  potion: (effect: string) => string
  baseLabel: () => string
}): React.ReactElement {
  const { openItem } = useApp()
  return (
    <section className="section">
      <h3 className="section__title">{title}</h3>
      <div className="section__body">
        {steps.map((step) => (
          <div className="recipe recipe--brew" key={`${step.from}-${step.ingredient}`}>
            <PotionSlot label={baseLabel()} />
            <Slot id={step.ingredient} onOpen={openItem} />
            <Arrow />
            <PotionSlot label={potion(step.to)} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** У зелий нет отдельных иконок — показываем общий флакон с подписью. */
function PotionSlot({ label }: { label: string }): React.ReactElement {
  return (
    <figure className="brew-item">
      <Slot id="potion" />
      <figcaption>{label}</figcaption>
    </figure>
  )
}

function ModifierRow({
  ingredient,
  label,
  values,
}: {
  ingredient: string
  label: string
  values: string[]
}): React.ReactElement {
  const { openItem } = useApp()
  return (
    <div className="recipe">
      <Slot id={ingredient} onOpen={openItem} />
      <div className="recipe__note">
        <strong>{label}</strong>
        <div className="recipe__values">{values.join(' · ')}</div>
      </div>
    </div>
  )
}

function EnchantingStation(): React.ReactElement {
  const { version, t, lang, openItem } = useApp()
  const [list, setList] = useState<EnchantmentEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    loadEnchantments(version).then((loaded) => {
      if (!cancelled) setList(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  if (!list) return <p className="notice">{t.loading}</p>

  const nameOf = (id: string): string =>
    list.find((entry) => entry.id === id)?.names[lang] ?? id

  return (
    <>
      <Runes />
      <p className="notice">{t.enchantNote}</p>
      <div className="section__body">
        {list.map((entry) => (
          <article className="recipe recipe--enchantment" key={entry.id}>
            <header className="enchantment__head">
              <span className="enchantment__name">
                {entry.names[lang] ?? entry.id} {romanize(entry.maxLevel)}
              </span>
              {entry.treasureOnly ? <span className="enchantment__badge">{t.enchantTreasure}</span> : null}
            </header>

            <dl className="recipe__meta enchantment__meta">
              <div>
                <dt>{t.enchantAnvil}</dt>
                <dd>{entry.anvilCost}</dd>
              </div>
              <div>
                <dt>{t.enchantWeight}</dt>
                <dd>{entry.weight}</dd>
              </div>
            </dl>

            <div className="enchantment__items">
              {entry.items.slice(0, 12).map((id) => (
                <Slot key={id} id={id} size={32} onOpen={openItem} />
              ))}
              {entry.items.length > 12 ? (
                <span className="enchantment__more">+{entry.items.length - 12}</span>
              ) : null}
            </div>

            {entry.exclusiveWith.length > 0 ? (
              <p className="enchantment__conflicts">
                {t.enchantConflicts}: {entry.exclusiveWith.map(nameOf).join(', ')}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </>
  )
}


/**
 * Ткацкий станок: готовые дизайны с последовательностью нанесения слоёв
 * и полный каталог узоров с пометкой, какому нужен предмет-образец.
 */
function LoomStation(): React.ReactElement {
  const { version, t, lang, byId, openItem } = useApp()
  const [data, setData] = useState<(BannerData & { maskUrl: string }) | null>(null)
  const [openDesign, setOpenDesign] = useState<string | null>(null)
  useAppBack(openDesign !== null, () => setOpenDesign(null))

  useEffect(() => {
    let cancelled = false
    loadBanners(version).then((loaded) => {
      if (!cancelled) setData(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  if (!data) return <p className="notice">{t.loading}</p>

  const design = data.designs.find((entry) => entry.id === openDesign) ?? null

  return (
    <>
      <p className="notice">{t.loomNote}</p>

      <section className="section">
        <h3 className="section__title">{t.loomDesigns}</h3>
        <ul className="banner-gallery">
          {data.designs.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={`banner-card${entry.id === openDesign ? ' is-open' : ''}`}
                onClick={() => setOpenDesign(entry.id === openDesign ? null : entry.id)}
                aria-expanded={entry.id === openDesign}
              >
                <Banner data={data} base={entry.base} layers={entry.layers} width={56} />
                <span className="banner-card__name">{lang === 'ru' ? entry.ru : entry.en}</span>
                <span className="banner-card__layers">
                  {entry.layers.length + 1} {t.loomLayers}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {design ? <DesignSteps data={data} design={design} /> : null}

      <section className="section">
        <h3 className="section__title">{t.loomPatterns}</h3>
        <ul className="pattern-list">
          {data.patterns
            .filter((pattern) => pattern.id !== 'base')
            .map((pattern) => (
              <li className="pattern-row" key={pattern.id}>
                <Banner data={data} base="white" layers={[{ pattern: pattern.id, color: 'black' }]} width={26} />
                <span className="pattern-row__text">
                  <span className="pattern-row__name">
                    {pattern.names.black?.[lang] ?? pattern.id}
                  </span>
                  <span className="pattern-row__id">{pattern.id}</span>
                </span>
                {pattern.patternItem ? (
                  <button
                    type="button"
                    className="pattern-row__item"
                    onClick={() => openItem(pattern.patternItem!)}
                    title={itemName(byId.get(pattern.patternItem)?.names, lang, pattern.patternItem)}
                  >
                    <Slot id={pattern.patternItem} size={32} />
                  </button>
                ) : (
                  <span className="pattern-row__free">{t.loomDyeOnly}</span>
                )}
              </li>
            ))}
        </ul>
      </section>
    </>
  )
}

/** Последовательность шагов станка: на каждом добавляется ровно один слой. */
function DesignSteps({
  data,
  design,
}: {
  data: BannerData & { maskUrl: string }
  design: BannerDesign
}): React.ReactElement {
  const { t, lang, openItem } = useApp()
  const patternItemOf = (pattern: string): string | undefined =>
    data.patterns.find((entry) => entry.id === pattern)?.patternItem

  return (
    <section className="section">
      <h3 className="section__title">
        {t.loomSteps}: {lang === 'ru' ? design.ru : design.en}
      </h3>
      <div className="section__body">
        <div className="recipe recipe--loom">
          <Slot id={`${design.base}_banner`} onOpen={openItem} />
          <span className="recipe__note">{t.loomStart}</span>
          <Arrow />
          <Banner data={data} base={design.base} layers={[]} width={44} />
        </div>

        {design.layers.map((layer, index) => (
          <div className="recipe recipe--loom" key={`${layer.pattern}-${index}`}>
            <Banner data={data} base={design.base} layers={design.layers.slice(0, index)} width={44} />
            <Slot id={`${layer.color}_dye`} onOpen={openItem} />
            {patternItemOf(layer.pattern) ? (
              <Slot id={patternItemOf(layer.pattern)!} onOpen={openItem} />
            ) : null}
            <Arrow />
            <Banner
              data={data}
              base={design.base}
              layers={design.layers.slice(0, index + 1)}
              width={44}
              animate
            />
          </div>
        ))}
      </div>
    </section>
  )
}


/**
 * Парящие руны над столом зачарований.
 * Шрифт «стандартного галактического алфавита» лежит в ассетах игры, которых
 * в данных mcmeta нет, поэтому фигуры нарисованы — настроение передают,
 * но настоящим шрифтом игры не притворяются.
 */
const RUNE_PATHS = [
  'M2 2h8M6 2v16M2 18h8',
  'M2 2v16M2 2h8v8H2M6 10l4 8',
  'M2 18L6 2l4 16M3 12h6',
  'M2 2h8L2 18h8',
  'M6 2v16M2 6l4-4 4 4',
  'M2 2v16h8M2 10h6',
]

function Runes(): React.ReactElement {
  return (
    <div className="runes" aria-hidden>
      {RUNE_PATHS.map((path) => (
        <svg key={path} viewBox="0 0 12 20" focusable="false">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ))}
    </div>
  )
}
