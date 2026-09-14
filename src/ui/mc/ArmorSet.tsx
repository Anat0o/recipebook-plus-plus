/** Фронтальный вид полного надетого комплекта из атласа кузнечного стола. */
import type { ArmorTrimData } from '../../lib/data.ts'

export function ArmorSet({
  data,
  pattern,
  material,
  armor,
  width = 48,
  title,
}: {
  data: ArmorTrimData & { atlasUrl: string }
  pattern: string
  material: string
  armor: string
  width?: number
  title?: string
}): React.ReactElement {
  const index = data.index[`${pattern}/${material}/${armor}`]
  const height = width * data.height / data.width
  if (index === undefined) {
    return <span className="armor-set armor-set--missing" style={{ width, height }} aria-hidden />
  }
  const col = index % data.cols
  const row = Math.floor(index / data.cols)
  return (
    <span
      className="armor-set"
      style={{
        width,
        height,
        backgroundImage: `url(${data.atlasUrl})`,
        backgroundSize: `${data.cols * width}px auto`,
        backgroundPosition: `-${col * width}px -${row * height}px`,
      }}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
    />
  )
}
