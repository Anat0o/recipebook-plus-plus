/**
 * Слот ингредиента. Если рецепт принимает целый тег (любые доски),
 * слот перебирает варианты — так же, как книга рецептов в игре.
 */
import { useEffect, useState } from 'react'
import type { Ingredient } from '../../lib/schema.ts'
import { Slot } from './Sprite.tsx'
import { useApp } from '../../app/context.tsx'
import { itemName } from '../../i18n/index.ts'

const CYCLE_MS = 1200

export function IngredientSlot({
  ingredient,
  size = 44,
}: {
  ingredient: Ingredient | null
  size?: number
}): React.ReactElement {
  const { openItem, byId, lang, t } = useApp()
  const [step, setStep] = useState(0)

  const items = ingredient?.items ?? []
  const cycles = items.length > 1

  useEffect(() => {
    if (!cycles) return
    // «Уменьшение движения» — перебор вариантов отключаем, остаётся первый.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setStep((s) => s + 1), CYCLE_MS)
    return () => clearInterval(timer)
  }, [cycles])

  if (!ingredient || items.length === 0) return <Slot size={size} />

  const current = items[step % items.length]!
  const label = cycles
    ? `${t.anyOf} ${items.length}: ${itemName(byId.get(current)?.names, lang, current)}`
    : undefined

  return (
    <span className="mc-ingredient">
      <Slot id={current} size={size} onOpen={openItem} title={label} />
      {cycles ? <span className="mc-ingredient__count">{items.length}</span> : null}
    </span>
  )
}
