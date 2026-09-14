/**
 * Разделы «Автофермы» и «Редстоун».
 *
 * Гайд — это список материалов, порядок сборки, схемы по слоям и оговорки.
 * Схемы рисуются иконками текущей версии, а пометка издания говорит, где
 * постройка работает как описано: часть ферм на Bedrock ведёт себя иначе.
 */
import { useEffect, useState } from 'react'
import { useApp } from '../app/context.tsx'
import { itemName } from '../i18n/index.ts'
import { loadGuides, type GuideData } from '../lib/data.ts'
import { Slot } from '../ui/mc/Sprite.tsx'
import { Build3d } from '../ui/mc/Build3d.tsx'
import { useAppBack } from '../lib/back-gesture.ts'

export function FarmsScreen(): React.ReactElement {
  const { t } = useApp()
  return <GuideList category="farm" title={t.tabFarms} hint={t.farmsHint} />
}

export function RedstoneScreen(): React.ReactElement {
  const { t } = useApp()
  return <GuideList category="redstone" title={t.tabRedstone} hint={t.redstoneHint} />
}

function GuideList({
  category,
  title,
  hint,
}: {
  category: 'farm' | 'redstone'
  title: string
  hint: string
}): React.ReactElement {
  const { version, t, lang } = useApp()
  const [guides, setGuides] = useState<GuideData[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  useAppBack(open !== null, () => setOpen(null))

  useEffect(() => {
    let cancelled = false
    loadGuides(version).then((loaded) => {
      if (!cancelled) setGuides(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  // При смене версии открытый гайд может исчезнуть — возвращаемся к списку.
  useEffect(() => setOpen(null), [version])

  if (!guides) return <div className="screen">{t.loading}</div>

  const shown = guides.filter((guide) => guide.category === category)
  const current = shown.find((guide) => guide.id === open)

  if (current) {
    return <GuideDetail guide={current} onBack={() => setOpen(null)} />
  }

  return (
    <div className="screen">
      <h1 className="screen__title">{title}</h1>
      <p className="screen__hint">{hint}</p>

      <ul className="guide-list">
        {shown.map((guide) => (
          <li key={guide.id}>
            <button type="button" className="guide-card" onClick={() => setOpen(guide.id)}>
              <Slot id={guide.icon} size={40} />
              <span className="guide-card__text">
                <span className="guide-card__name">{guide.names[lang]}</span>
                <span className="guide-card__summary">{guide.summaries[lang]}</span>
                <EditionBadge editions={guide.editions} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GuideDetail({
  guide,
  onBack,
}: {
  guide: GuideData
  onBack: () => void
}): React.ReactElement {
  const { t, lang, byId, openItem, versionLabel } = useApp()

  return (
    <div className="screen">
      <button type="button" className="mc-button guide-back" onClick={onBack}>
        ← {t.close}
      </button>

      <div className="item-head">
        <Slot id={guide.icon} size={56} />
        <div>
          <h1 className="item-head__name">{guide.names[lang]}</h1>
          <span className="item-head__id">{versionLabel}</span>
        </div>
      </div>

      <p className="notice">{guide.summaries[lang]}</p>
      <EditionBadge editions={guide.editions} wide />

      <section className="section">
        <h2 className="section__title">{t.materials}</h2>
        <ul className="material-list">
          {guide.materials.map((material) => (
            <li key={material.id}>
              <Slot id={material.id} size={34} count={material.count} onOpen={openItem} />
              <span>{itemName(byId.get(material.id)?.names, lang, material.id)}</span>
            </li>
          ))}
        </ul>
      </section>

      {guide.builds.map((build, index) => (
        <section className="section" key={index}>
          <Build3d
            title={build.names[lang]}
            placements={build.placements}
            steps={build.steps}
            entities={build.entities}
            animation={build.animation}
          />
        </section>
      ))}

      {guide.notes[lang] && guide.notes[lang]!.length > 0 ? (
        <section className="section">
          <h2 className="section__title">{t.guideNotes}</h2>
          <ul className="note-list">
            {guide.notes[lang]!.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** Где схема работает как описано. */
export function EditionBadge({
  editions,
  wide,
}: {
  editions: ('java' | 'bedrock')[]
  wide?: boolean
}): React.ReactElement {
  const { t } = useApp()
  const label =
    editions.length > 1
      ? t.editionBoth
      : editions[0] === 'bedrock'
        ? t.editionBedrock
        : t.editionJava
  return <span className={`edition-badge${wide ? ' edition-badge--wide' : ''}`}>{label}</span>
}
