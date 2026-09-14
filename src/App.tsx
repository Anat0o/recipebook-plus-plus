/** Каркас приложения: загрузка версии, навигация, шит карточки предмета. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadVersion, loadVersionList, type VersionData, type VersionList } from './lib/data.ts'
import { backOrNavigate, navigate, useRoute } from './lib/router.ts'
import { requestAppBack, useBackSwipe } from './lib/back-gesture.ts'
import { strings, type Lang } from './i18n/index.ts'
import { AppProvider, type AppState } from './app/context.tsx'
import { TabBar, TAB_ICONS, type TabId } from './ui/mc/TabBar.tsx'
import { Sheet } from './ui/mc/Sheet.tsx'
import { ItemDetail } from './routes/ItemDetail.tsx'
import { StationDetail } from './routes/StationDetail.tsx'
import { CatalogScreen, SettingsScreen } from './routes/screens.tsx'
import { FarmsScreen, RedstoneScreen } from './routes/Guides.tsx'
import { VillagersScreen } from './routes/Villagers.tsx'

const LANG_KEY = 'recipebook.lang'
const COMMAND_ONLY_KEY = 'recipebook.showCommandOnly'

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'ru' || saved === 'en') return saved
  return navigator.language.startsWith('ru') ? 'ru' : 'en'
}

export function App(): React.ReactElement {
  const route = useRoute()
  const [list, setList] = useState<VersionList | null>(null)
  const [listError, setListError] = useState(false)
  const [listAttempt, setListAttempt] = useState(0)
  const [data, setData] = useState<VersionData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [lang, setLang] = useState<Lang>(initialLang)
  const [tab, setTab] = useState<TabId>('catalog')
  const [tabRootKey, setTabRootKey] = useState(0)
  const [showCommandOnly, setShowCommandOnly] = useState(
    () => localStorage.getItem(COMMAND_ONLY_KEY) === '1',
  )

  const t = strings(lang)

  useEffect(() => {
    let cancelled = false
    setListError(false)
    loadVersionList().then((loaded) => { if (!cancelled) setList(loaded) })
      .catch(() => { if (!cancelled) setListError(true) })
    return () => { cancelled = true }
  }, [listAttempt])

  const version = route.name === 'home' ? (route.version ?? list?.default) : route.version

  useEffect(() => {
    if (!version) return
    let cancelled = false
    setData(null)
    setLoadError(false)
    loadVersion(version).then((loaded) => {
      if (!cancelled) setData(loaded)
    }).catch(() => { if (!cancelled) setLoadError(true) })
    return () => {
      cancelled = true
    }
  }, [version, loadAttempt])

  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem(COMMAND_ONLY_KEY, showCommandOnly ? '1' : '0')
  }, [showCommandOnly])

  // Фоновая плитка — текстура блока из той же версии, что сейчас открыта.
  useEffect(() => {
    if (!data || !version) return
    const base = `${import.meta.env.BASE_URL}data/${version}`
    const dark = matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const tile = dark.matches ? data.meta.tiles.dark : data.meta.tiles.light
      document.body.style.setProperty('--mc-tile', `url(${base}/${tile})`)
      document.body.style.setProperty('--mc-flame', `url(${base}/${data.meta.tiles.flame})`)
      document.body.style.setProperty('--mc-flame-frames', String(data.meta.tiles.flameFrames))
    }
    apply()
    dark.addEventListener('change', apply)
    return () => dark.removeEventListener('change', apply)
  }, [data, version])

  const openItem = useCallback(
    (id: string) => {
      if (version) navigate({ name: 'item', version, id })
    },
    [version],
  )

  const openStation = useCallback(
    (id: string) => {
      if (version) navigate({ name: 'station', version, id })
    },
    [version],
  )

  const closeSheet = useCallback(() => {
    if (version) navigate({ name: 'home', version }, true)
  }, [version])

  const goBack = useCallback(() => {
    if (requestAppBack()) return
    if (version && (route.name === 'item' || route.name === 'station')) {
      backOrNavigate({ name: 'home', version })
    }
  }, [route.name, version])

  useBackSwipe(goBack)

  const selectTab = useCallback((id: TabId) => {
    const repeated = id === tab
    if (version && route.name !== 'home') navigate({ name: 'home', version }, true)
    if (repeated) setTabRootKey((value) => value + 1)
    else setTab(id)
    scrollTo(0, 0)
  }, [route.name, tab, version])

  const state: AppState | null = useMemo(() => {
    if (!data || !version) return null
    return {
      version,
      versionLabel: data.meta.label,
      dataDrivenTrades: data.meta.dataDrivenTrades,
      shards: data.meta.shards,
      items: data.items,
      byId: data.byId,
      sprites: data.sprites,
      spriteUrl: data.spriteUrl,
      entityNames: data.entityNames,
      lang,
      t,
      openItem,
      showCommandOnly,
      meta: data.meta,
    }
  }, [data, version, lang, t, openItem, showCommandOnly])

  if (listError || loadError) {
    return <div className="screen"><p className="notice">{t.versionLoadError}</p><button className="mc-button" onClick={() => {
      if (listError) setListAttempt((value) => value + 1)
      else setLoadAttempt((value) => value + 1)
    }}>{t.retry}</button></div>
  }

  if (!state || !list) {
    return <div className="screen">{t.loading}</div>
  }

  const tabs = [
    { id: 'catalog' as const, label: t.tabCatalog, icon: TAB_ICONS.catalog },
    { id: 'farms' as const, label: t.tabFarms, icon: TAB_ICONS.farms },
    { id: 'redstone' as const, label: t.tabRedstone, icon: TAB_ICONS.redstone },
    { id: 'villagers' as const, label: t.tabVillagers, icon: TAB_ICONS.villagers },
    { id: 'settings' as const, label: t.settings, icon: TAB_ICONS.settings },
  ]

  return (
    <AppProvider value={state}>
      <div className="app">
        {tab === 'catalog' ? <CatalogScreen key={`catalog-${tabRootKey}`} onOpenStation={openStation} /> : null}
        {tab === 'farms' ? <FarmsScreen key={`farms-${tabRootKey}`} /> : null}
        {tab === 'redstone' ? <RedstoneScreen key={`redstone-${tabRootKey}`} /> : null}
        {tab === 'villagers' ? <VillagersScreen key={`villagers-${tabRootKey}`} /> : null}
        {tab === 'settings' ? (
          <SettingsScreen
            key={`settings-${tabRootKey}`}
            versions={list.versions}
            onVersion={(id) => navigate({ name: 'home', version: id })}
            onLang={setLang}
            showCommandOnly={showCommandOnly}
            onShowCommandOnly={setShowCommandOnly}
          />
        ) : null}

        <p className="footer">{t.disclaimer}</p>

        <TabBar tabs={tabs} active={tab} onSelect={selectTab} minimized={false} navLabel={t.sections} />

        <Sheet
          open={route.name === 'item' || route.name === 'station'}
          onClose={closeSheet}
          title={route.name === 'item' || route.name === 'station' ? route.id : ''}
          closeLabel={t.close}
          initialDetent="large"
        >
          {route.name === 'item' ? <ItemDetail itemId={route.id} /> : null}
          {route.name === 'station' ? <StationDetail stationId={route.id} /> : null}
        </Sheet>
      </div>
    </AppProvider>
  )
}
