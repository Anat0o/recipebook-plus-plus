/** Единый «назад» для вложенных экранов и свайпа от левого края телефона. */
import { useEffect, useRef } from 'react'

const EVENT = 'recipebook-back'

/** Даёт самому глубокому открытому экрану первым обработать возврат. */
export function requestAppBack(): boolean {
  const event = new Event(EVENT, { cancelable: true })
  dispatchEvent(event)
  return event.defaultPrevented
}

export function useAppBack(active: boolean, onBack: () => void): void {
  const callback = useRef(onBack)
  callback.current = onBack
  useEffect(() => {
    if (!active) return
    const handle = (event: Event): void => {
      event.preventDefault()
      callback.current()
    }
    addEventListener(EVENT, handle)
    return () => removeEventListener(EVENT, handle)
  }, [active])
}

export function useBackSwipe(onBack: () => void): void {
  const callback = useRef(onBack)
  callback.current = onBack
  useEffect(() => {
    let gesture: { pointer: number; x: number; y: number; at: number } | null = null
    const down = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' || event.clientX > 32 || !event.isPrimary) return
      gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() }
    }
    const cancel = (event: PointerEvent): void => {
      if (gesture?.pointer === event.pointerId) gesture = null
    }
    const up = (event: PointerEvent): void => {
      if (!gesture || gesture.pointer !== event.pointerId) return
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      const elapsed = performance.now() - gesture.at
      gesture = null
      if (dx >= 72 && Math.abs(dy) <= 56 && dx > Math.abs(dy) * 1.25 && elapsed <= 900) {
        callback.current()
      }
    }
    addEventListener('pointerdown', down, { passive: true })
    addEventListener('pointerup', up, { passive: true })
    addEventListener('pointercancel', cancel, { passive: true })
    return () => {
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', cancel)
    }
  }, [])
}
