/**
 * Карточка предмета: все способы получения, применение и свойства.
 * Живёт в шите с детентами — контекст списка остаётся виден за ним.
 */
import { useEffect, useMemo, useState } from 'react'
import type { ItemPage, Source, UseRef } from '../lib/schema.ts'
import { loadItemPage } from '../lib/data.ts'
import { useApp } from '../app/context.tsx'
import { itemName } from '../i18n/index.ts'
import { Slot } from '../ui/mc/Sprite.tsx'
import { RecipeCard, type LootControls } from '../ui/mc/Recipes.tsx'
import { LevelSlider, SegmentedControl, Toggle } from '../ui/mc/controls.tsx'
import { Build3d } from '../ui/mc/Build3d.tsx'
import { loadMultiblocks, type MultiblockData } from '../lib/data.ts'

type Tab = 'obtain' | 'uses'

export function ItemDetail({ itemId }: { itemId: string }): React.ReactElement {
  const app = useApp()
  const { t, lang, byId, version, shards, openItem, sprites } = app

  const [page, setPage] = useState<ItemPage | null | 'loading'>('loading')
  const [tab, setTab] = useState<Tab>('obtain')
  const [controls, setControls] = useState<LootControls>({ fortune: 0, looting: 0, killedByPlayer: true })

  useEffect(() => {
    let cancelled = false
    setPage('loading')
    setTab('obtain')
    loadItemPage(version, shards, itemId).then((result) => {
      if (!cancelled) setPage(result)
    })
    return () => {
      cancelled = true
    }
  }, [version, shards, itemId])

  const entry = byId.get(itemId)
  const name = itemName(entry?.names, lang, itemId)

  // «Ломаешь блок — получаешь его же» не сообщает ничего и только шумит.
  // Но если других способов нет, карточка остаётся: иначе у камня Энда,
  // листвы и бетона вкладка «Получение» опустела бы.
  const sources = useMemo<Source[]>(() => {
    if (!page || page === 'loading') return []
    const useful = page.from.filter((source) => !(source.kind === 'loot' && source.selfDrop))
    return useful.length > 0 ? useful : page.from
  }, [page])

  const groups = useMemo(() => groupSources(sources), [sources])

  const needs = useMemo(() => {
    if (!page || page === 'loading') return { fortune: false, looting: false, player: false }
    return {
      fortune: sources.some((s) => s.kind === 'loot' && s.byLevel?.enchantment === 'fortune'),
      looting: sources.some((s) => s.kind === 'loot' && s.byLevel?.enchantment === 'looting'),
      player: sources.some((s) => s.kind === 'loot' && s.conditions.includes('killed_by_player')),
    }
  }, [page, sources])

  return (
    <div className="item-detail">
      <header className="item-head">
        <Slot id={itemId} size={56} />
        <div>
          <h2 className="item-head__name">{name}</h2>
          <span className="item-head__id">{itemId}</span>
        </div>
      </header>

      {sprites.approx.includes(itemId) ? <p className="notice">{t.approxIcon}</p> : null}

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        label={name}
        options={[
          { value: 'obtain', label: t.sectionObtain },
          { value: 'uses', label: t.sectionUses },
        ]}
      />

      {page === 'loading' ? <p className="notice">{t.loading}</p> : null}

      {page !== 'loading' && tab === 'obtain' ? (
        <>
          {(needs.fortune || needs.looting || needs.player) && (
            <div className="section">
              {needs.fortune && (
                <LevelSlider
                  label={t.fortune}
                  max={3}
                  value={controls.fortune}
                  onChange={(fortune) => setControls((c) => ({ ...c, fortune }))}
                />
              )}
              {needs.looting && (
                <LevelSlider
                  label={t.looting}
                  max={3}
                  value={controls.looting}
                  onChange={(looting) => setControls((c) => ({ ...c, looting }))}
                />
              )}
              {needs.player && (
                <Toggle
                  label={t.killedByPlayer}
                  checked={controls.killedByPlayer}
                  onChange={(killedByPlayer) => setControls((c) => ({ ...c, killedByPlayer }))}
                />
              )}
            </div>
          )}

          {groups.length === 0 ? <p className="notice">{t.noSources}</p> : null}

          {groups.map(([groupKey, sources]) => (
            <section className="section" key={groupKey}>
              <h3 className="section__title">{t[groupKey]}</h3>
              <div className="section__body">
                {sources.map((source, i) => (
                  <RecipeCard key={i} source={source} controls={controls} />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : null}

      {page !== 'loading' && tab === 'uses' ? (
        <>
          <Multiblocks ids={page?.multiblocks ?? []} />
          <UsesList uses={page?.uses ?? []} onOpen={openItem} />
        </>
      ) : null}
    </div>
  )
}

function UsesList({ uses, onOpen }: { uses: UseRef[]; onOpen: (id: string) => void }): React.ReactElement {
  const { t, byId, lang } = useApp()
  if (uses.length === 0) return <p className="notice">{t.noUses}</p>

  const byResult = new Map<string, UseRef>()
  for (const use of uses) if (!byResult.has(use.result)) byResult.set(use.result, use)

  return (
    <ul className="item-grid">
      {[...byResult.values()].map((use) => (
        <li key={use.result}>
          <button type="button" className="item-tile" onClick={() => onOpen(use.result)}>
            <Slot id={use.result} size={44} />
            <span>{itemName(byId.get(use.result)?.names, lang, use.result)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

type GroupKey =
  | 'groupCraft' | 'groupCook' | 'groupStonecut' | 'groupSmith' | 'groupTransmute' | 'groupDynamic'
  | 'groupBlock' | 'groupEntity' | 'groupChest' | 'groupGameplay' | 'groupArchaeology'
  | 'groupTrade' | 'groupSpecial' | 'groupOther'

/** Порядок разделов на странице — от рукотворного к добываемому. */
const GROUP_ORDER: GroupKey[] = [
  'groupCraft', 'groupCook', 'groupStonecut', 'groupSmith', 'groupTransmute', 'groupDynamic',
  'groupBlock', 'groupEntity', 'groupChest', 'groupGameplay', 'groupArchaeology',
  'groupTrade', 'groupSpecial', 'groupOther',
]

function groupKeyOf(source: Source): GroupKey {
  switch (source.kind) {
    case 'craft': return 'groupCraft'
    case 'cook': return 'groupCook'
    case 'stonecut': return 'groupStonecut'
    case 'smith': return 'groupSmith'
    case 'transmute': return 'groupTransmute'
    case 'dynamic': return 'groupDynamic'
    case 'trade': return 'groupTrade'
    case 'hardcoded': return 'groupSpecial'
    case 'loot':
      switch (source.context) {
        case 'block': return 'groupBlock'
        case 'entity': return 'groupEntity'
        case 'chest': return 'groupChest'
        case 'gameplay': return 'groupGameplay'
        case 'archaeology': return 'groupArchaeology'
        default: return 'groupOther'
      }
  }
}

function groupSources(sources: Source[]): [GroupKey, Source[]][] {
  const groups = new Map<GroupKey, Source[]>()
  for (const source of sources) {
    const key = groupKeyOf(source)
    const list = groups.get(key)
    if (list) list.push(source)
    else groups.set(key, [source])
  }
  // Внутри группы сначала самое вероятное — так полезная информация выше.
  for (const list of groups.values()) {
    list.sort((a, b) => (b.kind === 'loot' ? b.chance : 1) - (a.kind === 'loot' ? a.chance : 1))
  }
  return GROUP_ORDER.filter((key) => groups.has(key)).map((key) => [key, groups.get(key)!])
}


/**
 * Постройки, в которых участвует предмет: призыв Визера, големы, маяк.
 * В рецептах их нет — форму проверяет код игры, поэтому справочник отдельный.
 */
function Multiblocks({ ids }: { ids: string[] }): React.ReactElement | null {
  const { version, lang } = useApp()
  const [all, setAll] = useState<MultiblockData[] | null>(null)

  useEffect(() => {
    if (ids.length === 0) return
    let cancelled = false
    loadMultiblocks(version).then((loaded) => {
      if (!cancelled) setAll(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [version, ids.length])

  if (ids.length === 0) return null
  const shown = (all ?? []).filter((entry) => ids.includes(entry.id))
  if (shown.length === 0) return null

  return (
    <>
      {shown.map((entry) => (
        <section className="section" key={entry.id}>
          <h3 className="section__title">{entry.names[lang]}</h3>
          <div className="mc-panel multiblock">
            <Build3d placements={entry.placements} steps={entry.steps} />
            <p className="settings-note">{entry.notes[lang]}</p>
          </div>
        </section>
      ))}
    </>
  )
}
