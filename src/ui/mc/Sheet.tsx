/**
 * Шит с детентами — как модальные панели iOS.
 *
 * Два положения: medium (примерно половина экрана) и large. Грабер служит
 * и подсказкой, и мишенью: перетаскивание меняет высоту, тап переключает
 * положение, свайп вниз ниже medium закрывает шит.
 */
import { useEffect, useRef, useState } from 'react'

export type Detent = 'medium' | 'large'

const DETENT_HEIGHT: Record<Detent, number> = { medium: 0.54, large: 0.94 }
/** Ниже этой доли экрана считаем жест закрытием. */
const DISMISS_THRESHOLD = 0.34

export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  initialDetent = 'medium',
}: {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: React.ReactNode
  initialDetent?: Detent
}): React.ReactElement | null {
  const [detent, setDetent] = useState<Detent>(initialDetent)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDetent(initialDetent)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !sheetRef.current) return
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]!
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    addEventListener('keydown', onKey)
    requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])')?.focus())
    return () => {
      removeEventListener('keydown', onKey)
      returnFocusRef.current?.focus()
    }
  }, [open, initialDetent, onClose])

  if (!open) return null

  const height = dragHeight ?? DETENT_HEIGHT[detent]

  const onPointerDown = (event: React.PointerEvent): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = { startY: event.clientY, startHeight: DETENT_HEIGHT[detent] }
  }

  const onPointerMove = (event: React.PointerEvent): void => {
    const state = dragState.current
    if (!state) return
    const delta = (state.startY - event.clientY) / innerHeight
    setDragHeight(Math.min(DETENT_HEIGHT.large, Math.max(0.12, state.startHeight + delta)))
  }

  const onPointerUp = (): void => {
    const current = dragHeight
    dragState.current = null
    setDragHeight(null)
    if (current === null) {
      // Тап по граберу перебирает положения — так же ведёт себя система.
      setDetent((d) => (d === 'medium' ? 'large' : 'medium'))
      return
    }
    if (current < DISMISS_THRESHOLD) {
      onClose()
      return
    }
    const midpoint = (DETENT_HEIGHT.medium + DETENT_HEIGHT.large) / 2
    setDetent(current > midpoint ? 'large' : 'medium')
  }

  return (
    <div className="sheet-layer">
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label={closeLabel} tabIndex={-1} />
      <div
        ref={sheetRef}
        className={`sheet${dragHeight === null ? ' is-settling' : ''}`}
        style={{ height: `${height * 100}%` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="sheet__grabber-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet__grabber" aria-hidden />
        </div>
        <div className="sheet__bar">
          <button type="button" className="sheet__close" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <div className="sheet__content">{children}</div>
      </div>
    </div>
  )
}
