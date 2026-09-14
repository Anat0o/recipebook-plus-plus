/** Экраны разделов: каталог со станциями и поиском, настройки. */
import { useDeferredValue, useMemo, useState } from 'react'
import { useApp } from '../app/context.tsx'
import { itemName, LANGS, type Lang } from '../i18n/index.ts'
import { searchItems } from '../lib/search.ts'
import { ItemSprite, Slot } from '../ui/mc/Sprite.tsx'
import { SearchField, SegmentedControl, Toggle } from '../ui/mc/controls.tsx'
import { OfflineSection } from '../ui/mc/Offline.tsx'

/** Станции: точка входа «что вообще можно сделать на этом блоке». */
const STATIONS: { id: string; ru: string; en: string }[] = [
  { id: 'crafting_table', ru: 'Верстак', en: 'Crafting table' },
  { id: 'furnace', ru: 'Печь', en: 'Furnace' },
  { id: 'blast_furnace', ru: 'Плавильня', en: 'Blast furnace' },
  { id: 'smoker', ru: 'Коптильня', en: 'Smoker' },
  { id: 'campfire', ru: 'Костёр', en: 'Campfire' },
  { id: 'stonecutter', ru: 'Камнерез', en: 'Stonecutter' },
  { id: 'smithing_table', ru: 'Кузнечный стол', en: 'Smithing table' },
  { id: 'brewing_stand', ru: 'Варочная стойка', en: 'Brewing stand' },
  { id: 'enchanting_table', ru: 'Стол зачарований', en: 'Enchanting table' },
  { id: 'anvil', ru: 'Наковальня', en: 'Anvil' },
  { id: 'grindstone', ru: 'Точило', en: 'Grindstone' },
  { id: 'loom', ru: 'Ткацкий станок', en: 'Loom' },
  { id: 'cartography_table', ru: 'Картографический стол', en: 'Cartography table' },
  { id: 'composter', ru: 'Компостер', en: 'Composter' },
  { id: 'beacon', ru: 'Маяк', en: 'Beacon' },
]

/**
 * Каталог: станции, сетка предметов и поиск.
 *
 * Поиск живёт здесь, а не отдельной вкладкой: искать предмет и листать каталог —
 * одно и то же занятие. Поле закреплено внизу, над навигационной панелью, чтобы
 * до него доставал большой палец.
 */
export function CatalogScreen({
  onOpenStation,
}: {
  onOpenStation: (id: string) => void
}): React.ReactElement {
  const { items, t, lang, openItem, showCommandOnly } = useApp()
  const [filter, setFilter] = useState<'all' | 'blocks' | 'items'>('all')
  const [query, setQuery] = useState('')
  // Список большой: откладываем пересчёт, чтобы ввод не подтормаживал.
  const deferredQuery = useDeferredValue(query)

  const visible = useMemo(
    () => (showCommandOnly ? items : items.filter((item) => !item.commandOnly)),
    [items, showCommandOnly],
  )

  const shown = useMemo(() => {
    if (deferredQuery !== '') return searchItems(visible, deferredQuery)
    const list = visible.filter((item) =>
      filter === 'all' ? true : filter === 'blocks' ? item.isBlock : !item.isBlock,
    )
    return [...list].sort((a, b) =>
      itemName(a.names, lang, a.id).localeCompare(itemName(b.names, lang, b.id), lang),
    )
  }, [visible, filter, lang, deferredQuery])

  const searching = deferredQuery !== ''

  return (
    <div className="screen screen--catalog">
      <h1 className="screen__title">{t.tabCatalog}</h1>

      {!searching ? (
        <section className="section">
          <h2 className="section__title">{t.tabStations}</h2>
          <ul className="item-grid item-grid--stations">
            {STATIONS.map((station) => (
              <li key={station.id}>
                <button
                  type="button"
                  className="item-tile"
                  onClick={() => onOpenStation(station.id)}
                >
                  <Slot id={station.id} size={40} />
                  <span>{lang === 'ru' ? station.ru : station.en}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!searching ? (
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          label={t.tabCatalog}
          options={[
            { value: 'all', label: lang === 'ru' ? 'Все' : 'All' },
            { value: 'blocks', label: lang === 'ru' ? 'Блоки' : 'Blocks' },
            { value: 'items', label: lang === 'ru' ? 'Предметы' : 'Items' },
          ]}
        />
      ) : null}

      <p className="screen__hint">
        {searching ? `${t.searchResults}: ${shown.length}` : shown.length}
      </p>

      {searching && shown.length === 0 ? (
        <div className="notice">
          <strong>{t.searchEmpty}</strong>
          <br />
          {t.searchEmptyHint}
        </div>
      ) : null}

      {searching ? (
        <ul className="item-list">
          {shown.map((item) => (
            <li key={item.id}>
              <button type="button" className="item-row" onClick={() => openItem(item.id)}>
                <ItemSprite id={item.id} size={32} />
                <span>
                  <span className="item-row__name">{itemName(item.names, lang, item.id)}</span>
                  <span className="item-row__id">{item.id}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="item-grid">
          {shown.map((item) => (
            <li key={item.id}>
              <button type="button" className="item-tile" onClick={() => openItem(item.id)}>
                <Slot id={item.id} size={44} />
                <span>{itemName(item.names, lang, item.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="catalog-search">
        <SearchField value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
      </div>
    </div>
  )
}

export function SettingsScreen({
  versions,
  onVersion,
  onLang,
  showCommandOnly,
  onShowCommandOnly,
}: {
  versions: { id: string; label: string }[]
  onVersion: (id: string) => void
  onLang: (lang: Lang) => void
  showCommandOnly: boolean
  onShowCommandOnly: (value: boolean) => void
}): React.ReactElement {
  const { t, lang, version, dataDrivenTrades, items } = useApp()
  const hidden = items.filter((item) => item.commandOnly).length

  return (
    <div className="screen">
      <h1 className="screen__title">{t.settings}</h1>

      <p className="settings-group__title">{t.version}</p>
      <div className="settings-group">
        {versions.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="item-row"
            onClick={() => onVersion(entry.id)}
            aria-current={entry.id === version}
          >
            <span className="item-row__name">{entry.label}</span>
            {entry.id === version ? <span className="item-row__check">✓</span> : null}
          </button>
        ))}
      </div>

      <p className="settings-group__title">{t.language}</p>
      <div className="settings-group">
        {LANGS.map((entry) => (
          <button
            key={entry.code}
            type="button"
            className="item-row"
            onClick={() => onLang(entry.code)}
            aria-current={entry.code === lang}
          >
            <span className="item-row__name">{entry.label}</span>
            {entry.code === lang ? <span className="item-row__check">✓</span> : null}
          </button>
        ))}
      </div>

      <p className="settings-group__title">{t.catalogGroup}</p>
      <div className="settings-group settings-group--padded">
        <Toggle
          checked={showCommandOnly}
          onChange={onShowCommandOnly}
          label={t.showCommandOnly}
        />
        <p className="settings-note">{t.showCommandOnlyNote.replace('{n}', String(hidden))}</p>
      </div>

      <OfflineSection />

      {!dataDrivenTrades ? <p className="notice">{t.tradesUnavailable}</p> : null}
    </div>
  )
}
