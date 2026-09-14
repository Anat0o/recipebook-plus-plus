/**
 * Баннер, собранный из слоёв-масок.
 *
 * Готовых картинок баннеров нет и не нужно: в данных лежит лента чёрно-белых
 * масок узоров, а цвет накладывает браузер через CSS-маску. Поэтому любой из
 * 16 цветов доступен без пересборки, а каждый слой остаётся отдельным элементом —
 * на этом же держится анимация послойной сборки на станке.
 */
import type { BannerData, BannerLayer } from '../../lib/data.ts'

export interface BannerProps {
  data: BannerData & { maskUrl: string }
  /** Цвет самого баннера. */
  base: string
  layers: BannerLayer[]
  /** Ширина в пикселях; высота всегда вдвое больше. */
  width?: number
  /** Проигрывать появление слоёв по очереди. */
  animate?: boolean
  title?: string
}

export function Banner({
  data,
  base,
  layers,
  width = 60,
  animate = false,
  title,
}: BannerProps): React.ReactElement {
  const height = width * 2
  const all: BannerLayer[] = [{ pattern: 'base', color: base }, ...layers]

  return (
    <span
      className={`banner${animate ? ' banner--animate' : ''}`}
      style={{ width, height }}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {all.map((layer, index) => (
        <BannerLayerView
          key={`${layer.pattern}-${layer.color}-${index}`}
          data={data}
          layer={layer}
          width={width}
          order={index}
        />
      ))}
    </span>
  )
}

function BannerLayerView({
  data,
  layer,
  width,
  order,
}: {
  data: BannerData & { maskUrl: string }
  layer: BannerLayer
  width: number
  order: number
}): React.ReactElement | null {
  const pattern = data.patterns.find((entry) => entry.id === layer.pattern)
  if (!pattern) return null

  const height = width * 2
  const mask = `url(${data.maskUrl})`
  const position = `0 ${-pattern.index * height}px`
  const size = `${width}px auto`

  return (
    <span
      className="banner__layer"
      style={{
        backgroundColor: data.colors[layer.color] ?? '#ff00ff',
        maskImage: mask,
        WebkitMaskImage: mask,
        maskPosition: position,
        WebkitMaskPosition: position,
        maskSize: size,
        WebkitMaskSize: size,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        // Задержка растёт со слоем — так видно порядок нанесения на станке.
        animationDelay: `${order * 180}ms`,
      }}
    />
  )
}
