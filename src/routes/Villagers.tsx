import { useEffect, useState } from 'react'
import { useApp } from '../app/context.tsx'
import { itemName, villagerLevelName, villagerVariantName } from '../i18n/index.ts'
import { loadVillagers, type VillagerCatalogData, type VillagerProfileData } from '../lib/data.ts'
import { Arrow, Slot } from '../ui/mc/Sprite.tsx'
import { SearchField } from '../ui/mc/controls.tsx'
import { useAppBack } from '../lib/back-gesture.ts'

export function VillagersScreen(): React.ReactElement {
  const { version, lang, t, byId } = useApp()
  const [data, setData] = useState<VillagerCatalogData | null>(null)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  useAppBack(selected !== null, () => setSelected(null))

  useEffect(() => {
    let cancelled = false
    setData(null); setError(false); setSelected(null)
    loadVillagers(version).then((loaded) => { if (!cancelled) setData(loaded) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [version, attempt])

  if (error) return <div className="screen"><p className="notice">{t.villagerLoadError}</p><button className="mc-button" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button></div>
  if (!data) return <div className="screen">{t.loading}</div>

  const current = data.profiles.find((profile) => profile.id === selected)
  if (current) return <VillagerDetail profile={current} onBack={() => setSelected(null)} />

  const needle = query.trim().toLocaleLowerCase(lang)
  const profiles = data.profiles.filter((profile) => {
    if (!needle) return true
    const items = profile.pools.flatMap((pool) => pool.offers.flatMap((offer) => [...offer.cost.map((s) => s.id), offer.result.id]))
    return [
      profile.names[lang], profile.id, profile.workstation,
      profile.workstation ? itemName(byId.get(profile.workstation)?.names, lang, profile.workstation) : '',
      ...items,
      ...items.map((id) => itemName(byId.get(id)?.names, lang, id)),
    ]
      .filter(Boolean).some((value) => String(value).toLocaleLowerCase(lang).includes(needle))
  })

  return <div className="screen screen--villagers">
    <h1 className="screen__title">{t.tabVillagers}</h1>
    <p className="screen__hint">{t.villagersHint}</p>
    <div className="villager-search" role="search" aria-label={t.villagerSearch}>
      <SearchField value={query} onChange={setQuery} placeholder={t.villagerSearchPlaceholder} clearLabel={t.clearSearch} />
    </div>
    {profiles.length === 0 ? <p className="notice">{t.villagerSearchEmpty}</p> : null}
    <ul className="villager-grid">
      {profiles.map((profile) => <li key={profile.id}>
        <button type="button" className="villager-card" onClick={() => setSelected(profile.id)}>
          <Slot id={profile.workstation ?? (profile.id === 'wandering_trader' ? 'emerald' : 'villager_spawn_egg')} size={42} />
          <span><strong>{profile.names[lang]}</strong><small>{profile.workstation ? itemName(byId.get(profile.workstation)?.names, lang, profile.workstation) : t.noJobBlock}</small><small>{profile.pools.reduce((sum, pool) => sum + pool.offers.length, 0)} {t.offers}</small></span>
        </button>
      </li>)}
    </ul>
  </div>
}

function VillagerDetail({ profile, onBack }: { profile: VillagerProfileData; onBack: () => void }): React.ReactElement {
  const { lang, byId, openItem, t } = useApp()
  return <div className="screen">
    <button type="button" className="mc-button guide-back" onClick={onBack}>← {t.allVillagers}</button>
    <div className="item-head">
      <Slot id={profile.workstation ?? (profile.id === 'wandering_trader' ? 'emerald' : 'villager_spawn_egg')} size={56} />
      <div><h1 className="item-head__name">{profile.names[lang]}</h1><span className="item-head__id">{profile.id}</span></div>
    </div>
    <section className="section">
      <h2 className="section__title">{t.jobBlock}</h2>
      {profile.workstation ? <button className="villager-workstation" onClick={() => openItem(profile.workstation!)}><Slot id={profile.workstation} size={38} /><span>{itemName(byId.get(profile.workstation)?.names, lang, profile.workstation)}</span></button> : <p className="notice">{t.noJobOrTrades}</p>}
    </section>
    {profile.variants.length ? <section className="section"><h2 className="section__title">{t.variants}</h2><div className="villager-variants">{profile.variants.map((id) => <span key={id}>{villagerVariantName(id, lang)}</span>)}</div></section> : null}
    {profile.pools.map((pool) => <section className="section" key={pool.id}>
      <h2 className="section__title">{pool.level ? `${villagerLevelName(pool.level, lang)} · ${t.levelWord} ${pool.level}` : pool.id.split('/').at(-1)?.replaceAll('_', ' ')}</h2>
      <p className="screen__hint">{t.gamePicks.replace('{picks}', String(pool.picks)).replace('{total}', String(pool.offers.length))}</p>
      <div className="villager-trades">{pool.offers.map((offer, index) => <div className="villager-trade" key={`${pool.id}-${index}`}>
        <div className="recipe__cost">{offer.cost.map((stack, i) => <Slot key={i} id={stack.id} count={offer.dynamicCost && i === 0 ? 0 : stack.count} onOpen={openItem} />)}</div><Arrow /><Slot id={offer.result.id} count={offer.result.count} size={48} onOpen={openItem} />
        <dl className="recipe__meta">
          {offer.dynamicCost ? <div><dt>{t.price}</dt><dd>{t.dynamicPrice}</dd></div> : null}
          {offer.maxUses ? <div><dt>{t.beforeRestock}</dt><dd>{offer.maxUses}</dd></div> : null}
          {offer.xp ? <div><dt>XP</dt><dd>{offer.xp}</dd></div> : null}
          {offer.reputationDiscount !== undefined ? <div><dt>{t.reputationDiscount}</dt><dd>{offer.reputationDiscount}</dd></div> : null}
        </dl>
        {offer.merchantVariants?.length ? <small>{t.variantsOnly}: {offer.merchantVariants.join(', ')}</small> : null}
        {offer.modifiers?.length ? <small>{t.result}: {offer.modifiers.join(', ')}</small> : null}
      </div>)}</div>
    </section>)}
  </div>
}
