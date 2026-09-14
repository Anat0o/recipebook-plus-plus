/** Иконка предмета — вырезка из общего атласа версии. */
import { useApp } from '../../app/context.tsx'
import { itemName } from '../../i18n/index.ts'

export function ItemSprite({ id, size = 32 }: { id: string; size?: number }): React.ReactElement {
  const { sprites, spriteUrl } = useApp()
  const index = sprites.index[id]

  if (index === undefined) {
    return <span className="mc-sprite mc-sprite--missing" style={{ width: size, height: size }} aria-hidden />
  }

  const col = index % sprites.cols
  const row = Math.floor(index / sprites.cols)
  return (
    <span
      className="mc-sprite"
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${spriteUrl})`,
        // Ширину задаём явно, высоту — auto: число строк атласа знать не нужно.
        backgroundSize: `${sprites.cols * size}px auto`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
      }}
    />
  )
}

/** Слот инвентаря с иконкой, количеством и переходом на страницу предмета. */
export function Slot({
  id,
  count,
  size = 44,
  onOpen,
  title,
}: {
  id?: string
  count?: number
  size?: number
  onOpen?: (id: string) => void
  title?: string
}): React.ReactElement {
  const { byId, lang } = useApp()

  if (!id) {
    return <span className="mc-slot mc-slot--empty" style={{ '--slot-size': `${size}px` } as React.CSSProperties} />
  }

  const label = title ?? itemName(byId.get(id)?.names, lang, id)
  const content = (
    <>
      <ItemSprite id={id} size={Math.round(size * 0.73)} />
      {count === 0 ? <span className="mc-count">?</span> : count && count > 1 ? <span className="mc-count">{count}</span> : null}
    </>
  )

  if (!onOpen) {
    return (
      <span className="mc-slot" style={{ '--slot-size': `${size}px` } as React.CSSProperties} title={label}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      className="mc-slot mc-slot--link"
      style={{ '--slot-size': `${size}px` } as React.CSSProperties}
      onClick={() => onOpen(id)}
      aria-label={label}
    >
      {content}
      {/* Подсказка как в инвентаре: тёмная плашка с фиолетовой рамкой. */}
      <span className="mc-tooltip">{label}</span>
    </button>
  )
}

/**
 * Стрелка рецепта. С флагом progress по ней бежит заливка —
 * так игра показывает ход плавки в печи.
 */
export function Arrow({ progress = false }: { progress?: boolean }): React.ReactElement {
  const path = 'M0 9h20V4l12 8-12 8v-5H0z'
  return (
    <svg className="mc-arrow" viewBox="0 0 32 24" aria-hidden focusable="false">
      <path fill="currentColor" d={path} opacity={progress ? 0.35 : 1} />
      {progress ? <path className="mc-arrow__fill" fill="currentColor" d={path} /> : null}
    </svg>
  )
}
