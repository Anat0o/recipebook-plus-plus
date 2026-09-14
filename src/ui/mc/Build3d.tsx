/**
 * Трёхмерная постройка: шаги сборки и готовый результат.
 *
 * Шаг — это кнопка с описанием действия: нажали — увидели ровно ту часть
 * постройки, о которой читаете. Отдельной ленты «Шаг 1, Шаг 2, Готово» больше
 * нет, как и второго, прозаического списка шагов над схемой: два списка про
 * одно и то же расходились между собой.
 *
 * Холст для скринридера пуст, поэтому под ним всегда стоит список блоков шага.
 * Он же остаётся единственной картинкой, если WebGL недоступен: показать
 * честное сообщение и перечень блоков лучше, чем пустое место.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/context.tsx'
import { itemName } from '../../i18n/index.ts'
import { loadBlocks, type AnimationSpec } from '../../lib/data.ts'
import { Redstone } from '../../lib/redstone.ts'
import type { BlockData } from '../../lib/webgl.ts'
import { BuildRenderer, DEFAULT_VIEW, type Placement, type SceneEntity, type View } from '../../lib/webgl.ts'
import { Slot } from './Sprite.tsx'

export function Build3d({
  placements,
  steps,
  title,
  entities = [],
  animation,
}: {
  placements: Placement[]
  /** Действия по шагам: одно описание на одну ступень сборки. */
  steps?: Record<string, string>[]
  title?: string
  entities?: SceneEntity[]
  animation?: AnimationSpec
}): React.ReactElement {
  const { t, lang, byId, version, openItem } = useApp()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<BuildRenderer | null>(null)
  const viewRef = useRef<View>({ ...DEFAULT_VIEW })
  const simRef = useRef<Redstone | null>(null)
  const entityRef = useRef<SceneEntity[]>(entities.map((entity) => ({ ...entity })))
  const tickRef = useRef(0)

  const [data, setData] = useState<(BlockData & { url: string }) | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [cutaway, setCutaway] = useState(false)
  const [sceneTick, setSceneTick] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const totalSteps = useMemo(
    () => Math.max(1, ...placements.map((placement) => placement.step)),
    [placements],
  )
  // Вкладок на одну больше числа шагов: последняя — готовый результат целиком.
  const finalTab = totalSteps + 1
  const [step, setStep] = useState(finalTab)

  useEffect(() => setStep(totalSteps + 1), [totalSteps])

  const resetAnimation = (): void => {
    simRef.current = new Redstone(placements)
    entityRef.current = entities.map((entity) => ({ ...entity }))
    tickRef.current = 0
    setSceneTick(0)
    setPlaying(false)
  }

  useEffect(resetAnimation, [placements, entities, animation])

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = (): void => {
      setReducedMotion(query.matches)
      if (query.matches) setPlaying(false)
    }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let cancelled = false
    setData(null)
    setFailed(false)
    loadBlocks(version)
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  // Создание рендера: атлас блоков грузится картинкой и уходит в текстуру.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return

    let disposed = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (disposed) return
      try {
        rendererRef.current = new BuildRenderer(canvas, image)
        redraw()
      } catch {
        setFailed(true)
      }
    }
    image.onerror = () => setFailed(true)
    image.src = data.url

    return () => {
      disposed = true
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [data])

  function redraw(): void {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer || !data) return

    // Холст в пикселях устройства: иначе пиксель-арт мылится.
    const ratio = Math.min(devicePixelRatio || 1, 2)
    const width = Math.round(canvas.clientWidth * ratio)
    const height = Math.round(canvas.clientHeight * ratio)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const finished = step === finalTab
    const scene = finished && simRef.current ? simRef.current.frame() : placements
    renderer.setScene(data, scene, entityRef.current, step, finished, cutaway && finished)
    renderer.draw(viewRef.current)
  }

  useEffect(redraw, [data, step, placements, sceneTick, cutaway])

  const advance = (): void => {
    const sim = simRef.current
    if (!sim) return
    const nextTick = tickRef.current + 1
    for (const event of animation?.events.filter((entry) => entry.tick === nextTick) ?? []) {
      if (event.type === 'press') sim.press(`${event.x},${event.y},${event.z}`)
      if (event.type === 'block') sim.setBlock(event.x, event.y, event.z, event.block, event.facing, event.variant)
      if (event.type === 'container') sim.setContainerSignal(event.x, event.y, event.z, event.signal)
      if (event.type === 'move') {
        const entity = entityRef.current.find((entry) => entry.id === event.entity)
        if (entity) Object.assign(entity, { x: event.x, y: event.y, z: event.z })
      }
      if (event.type === 'show') {
        const entity = entityRef.current.find((entry) => entry.id === event.entity)
        if (entity) entity.visible = event.visible
      }
    }
    sim.tick()
    tickRef.current = nextTick
    setSceneTick(nextTick)
    const duration = animation?.duration ?? 40
    if (nextTick >= duration) {
      if (animation?.loop) {
        sim.reset()
        entityRef.current = entities.map((entity) => ({ ...entity }))
        tickRef.current = 0
        setSceneTick(0)
      } else {
        setPlaying(false)
      }
    }
  }

  useEffect(() => {
    if (!playing || step !== finalTab) return
    let frame = 0
    let previous = performance.now()
    let carried = 0
    const loop = (now: number): void => {
      carried += now - previous
      previous = now
      const interval = 100 / speed
      while (carried >= interval) {
        carried -= interval
        advance()
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, step, finalTab, animation, entities])

  useEffect(() => {
    const onResize = (): void => redraw()
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  })

  // Жесты: перетаскивание вращает, щипок и колесо приближают.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pointers = new Map<number, { x: number; y: number }>()
    let pinch = 0

    const onDown = (event: PointerEvent): void => {
      canvas.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    const onMove = (event: PointerEvent): void => {
      const previous = pointers.get(event.pointerId)
      if (!previous) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const spread = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        if (pinch > 0) zoomBy(spread / pinch)
        pinch = spread
        return
      }

      const view = viewRef.current
      view.yaw += (event.clientX - previous.x) * 0.6
      // Наклон ограничен, иначе постройка переворачивается вверх ногами.
      view.pitch = Math.min(88, Math.max(-88, view.pitch - (event.clientY - previous.y) * 0.6))
      redraw()
    }

    const onUp = (event: PointerEvent): void => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinch = 0
    }

    const zoomBy = (factor: number): void => {
      const view = viewRef.current
      view.zoom = Math.min(4, Math.max(0.4, view.zoom * factor))
      redraw()
    }

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12)
    }

    const onDoubleClick = (): void => {
      viewRef.current = { ...DEFAULT_VIEW }
      redraw()
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDoubleClick)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDoubleClick)
    }
  }, [data, step, placements])

  /** Что ставится на текущем шаге: и подпись к холсту, и запасная картинка. */
  const stepBlocks = useMemo(() => {
    const counts = new Map<string, number>()
    for (const placement of placements) {
      // На готовом результате перечисляем всю постройку, на шаге — только его.
      if (step !== finalTab && placement.step !== step) continue
      counts.set(placement.block, (counts.get(placement.block) ?? 0) + 1)
    }
    return [...counts.entries()]
  }, [placements, step, finalTab])

  return (
    <figure className="build3d">
      {title ? <figcaption className="build3d__title">{title}</figcaption> : null}

      {failed ? (
        <p className="notice">{t.build3dUnavailable}</p>
      ) : (
        <canvas
          ref={canvasRef}
          className="build3d__canvas"
          role="img"
          aria-label={
            step === finalTab
              ? `${title ?? t.build3d}: ${t.stepFinal}`
              : `${title ?? t.build3d}: ${t.step} ${step} ${t.of} ${totalSteps}`
          }
        />
      )}

      <ol className="build3d__steps" role="tablist" aria-label={t.guideSteps}>
        {Array.from({ length: finalTab }, (_, index) => index + 1).map((value) => (
          <li key={value}>
            <button
              type="button"
              role="tab"
              aria-selected={value === step}
              className={`build3d__step${value === step ? ' is-active' : ''}`}
              onClick={() => setStep(value)}
            >
              <span className="build3d__step-mark" aria-hidden="true">
                {value === finalTab ? '✔' : value}
              </span>
              <span className="build3d__step-text">
                {value === finalTab
                  ? t.stepFinal
                  : (steps?.[value - 1]?.[lang] ?? `${t.step} ${value}`)}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="build3d__legend">
        <ul>
          {stepBlocks.map(([id, count]) => (
            <li key={id}>
              <Slot id={id} size={26} count={count} onOpen={openItem} />
              <span>{itemName(byId.get(id)?.names, lang, id)}</span>
            </li>
          ))}
        </ul>
      </div>

      {step === finalTab && (animation || Redstone.runnable(placements)) ? (
        <div className="build3d__animation" aria-label={t.mechanismControls}>
          <div className="build3d__animation-buttons">
            <button type="button" className="mc-button" disabled={reducedMotion} title={reducedMotion ? t.continuousMotionDisabled : undefined} onClick={() => setPlaying((value) => !value)}>
              {playing ? t.pause : t.play}
            </button>
            <button type="button" className="mc-button" onClick={advance}>
              {t.frame}
            </button>
            <button type="button" className="mc-button" onClick={resetAnimation}>
              {t.reset}
            </button>
            <button type="button" className={`mc-button${cutaway ? ' is-active' : ''}`} onClick={() => setCutaway((value) => !value)}>
              {t.cutaway}
            </button>
          </div>
          <div className="build3d__speed" role="group" aria-label={t.speed}>
            {[0.5, 1, 2].map((value) => (
              <button key={value} type="button" className={speed === value ? 'is-active' : ''} onClick={() => setSpeed(value)}>
                {value}×
              </button>
            ))}
          </div>
          {simRef.current?.interactive().length ? (
            <div className="build3d__inputs">
              {simRef.current.interactive().map((input) => (
                <button
                  key={`${input.x},${input.y},${input.z}`}
                  type="button"
                  onClick={() => { simRef.current?.press(`${input.x},${input.y},${input.z}`); advance() }}
                >
                  {itemName(byId.get(input.block)?.names, lang, input.block)} · {input.x},{input.y},{input.z}
                </button>
              ))}
            </div>
          ) : null}
          <span className="visually-hidden" aria-live="polite">
            {t.tick} {sceneTick}
          </span>
          <p className="build3d__state">
            {t.state}: {t.tick} {sceneTick}; {playing ? t.running : t.paused}.
          </p>
          {entities.length ? (
            <ul className="build3d__entities" aria-label={t.schematicEntities}>
              {entityRef.current.filter((entity) => entity.visible !== false).map((entity) => (
                <li key={entity.id}>{entity.type}: {entity.x.toFixed(1)}, {entity.y.toFixed(1)}, {entity.z.toFixed(1)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!failed ? <p className="build3d__hint">{t.build3dHint}</p> : null}
    </figure>
  )
}
