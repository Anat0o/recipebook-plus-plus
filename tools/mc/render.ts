/**
 * Программный рендер иконок предметов — то, что игрок видит в слоте инвентаря.
 *
 * Плоские предметы (builtin/generated) — это просто наложенные слои текстур.
 * Блоки рисуются изометрией: элементы модели превращаются в грани, к ним
 * применяется display-трансформация `gui` (обычно поворот [30, 225, 0] и масштаб 0.625),
 * дальше ортографическая проекция с z-буфером и попиксельной выборкой текстуры.
 */
import type { ResolvedModel, Vec3 } from './models.ts'
import { buildQuads, rotateAxis, type Quad } from './quads.ts'

export interface Atlas {
  width: number
  height: number
  /** RGBA, 4 байта на пиксель. */
  data: Buffer
  sprites: Record<string, [number, number, number, number]>
}

/** Применяет display-трансформацию gui и переводит модель в диапазон [-0.5, 0.5]. */
function applyGuiTransform(p: Vec3, gui: { rotation?: Vec3; translation?: Vec3; scale?: Vec3 }): Vec3 {
  // Пространство модели 0..16 → блочное, центр в (0,0,0).
  let v: Vec3 = [p[0] / 16 - 0.5, p[1] / 16 - 0.5, p[2] / 16 - 0.5]

  const s = gui.scale ?? [1, 1, 1]
  v = [v[0] * s[0], v[1] * s[1], v[2] * s[2]]

  const r = gui.rotation ?? [0, 0, 0]
  // Порядок как в игре: сначала X, затем Y, затем Z.
  if (r[0]) v = rotateAxis(v, 'x', r[0], [0, 0, 0])
  if (r[1]) v = rotateAxis(v, 'y', r[1], [0, 0, 0])
  if (r[2]) v = rotateAxis(v, 'z', r[2], [0, 0, 0])

  const t = gui.translation ?? [0, 0, 0]
  return [v[0] + t[0] / 16, v[1] + t[1] / 16, v[2] + t[2] / 16]
}

/**
 * Единый масштаб проекции: подобран так, чтобы целый куб 16³ со стандартной
 * gui-трансформацией ровно вписывался в иконку. Благодаря общему масштабу
 * половинка блока остаётся вдвое ниже целого, как в игре.
 */
const REFERENCE_GUI = { rotation: [30, 225, 0] as Vec3, scale: [0.625, 0.625, 0.625] as Vec3 }
const PROJECTION_SCALE = (() => {
  const cube: Vec3[] = []
  for (const x of [0, 16]) for (const y of [0, 16]) for (const z of [0, 16]) cube.push([x, y, z])
  const pts = cube.map((p) => applyGuiTransform(p, REFERENCE_GUI))
  const w = Math.max(...pts.map((p) => Math.abs(p[0]))) * 2
  const h = Math.max(...pts.map((p) => Math.abs(p[1]))) * 2
  return 1 / Math.max(w, h)
})()

export interface RenderResult {
  /** RGBA size×size. */
  data: Buffer
  size: number
}

function sampleSprite(atlas: Atlas, sprite: string, u: number, v: number): [number, number, number, number] | null {
  const rect = atlas.sprites[sprite]
  if (!rect) return null
  const [sx, sy, sw, sh] = rect
  // Анимированные текстуры лежат вертикальной лентой кадров — берём первый.
  const frame = sh > sw ? sw : sh
  const tx = sx + Math.min(sw - 1, Math.max(0, Math.floor(u * sw)))
  const ty = sy + Math.min(frame - 1, Math.max(0, Math.floor(v * frame)))
  const i = (ty * atlas.width + tx) * 4
  return [atlas.data[i]!, atlas.data[i + 1]!, atlas.data[i + 2]!, atlas.data[i + 3]!]
}

/** Плоский предмет: слои layer0, layer1, … накладываются друг на друга. */
function renderFlat(model: ResolvedModel, atlas: Atlas, size: number, tints: (number | null)[]): RenderResult {
  const out = Buffer.alloc(size * size * 4)
  for (let layer = 0; ; layer++) {
    const sprite = model.textures[`layer${layer}`]
    if (!sprite) break
    const name = sprite.replace(/^minecraft:/, '')
    const tint = tints[layer] ?? null
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = sampleSprite(atlas, name, (x + 0.5) / size, (y + 0.5) / size)
        if (!px || px[3] === 0) continue
        blend(out, (y * size + x) * 4, px, 1, tint)
      }
    }
  }
  return { data: out, size }
}

function blend(out: Buffer, i: number, px: [number, number, number, number], shade: number, tint: number | null): void {
  let [r, g, b, a] = px
  if (tint !== null) {
    r = (r * ((tint >> 16) & 0xff)) / 255
    g = (g * ((tint >> 8) & 0xff)) / 255
    b = (b * (tint & 0xff)) / 255
  }
  r *= shade
  g *= shade
  b *= shade
  const srcA = a / 255
  const dstA = out[i + 3]! / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA === 0) return
  out[i] = Math.round((r * srcA + out[i]! * dstA * (1 - srcA)) / outA)
  out[i + 1] = Math.round((g * srcA + out[i + 1]! * dstA * (1 - srcA)) / outA)
  out[i + 2] = Math.round((b * srcA + out[i + 2]! * dstA * (1 - srcA)) / outA)
  out[i + 3] = Math.round(outA * 255)
}

/** Изометрический рендер модели с элементами. */
function render3d(model: ResolvedModel, atlas: Atlas, size: number, tints: (number | null)[]): RenderResult {
  const gui = model.display.gui ?? REFERENCE_GUI
  const quads = buildQuads(model.elements, model.textures)
  const project = (p: Vec3): { x: number; y: number; z: number } => {
    const v = applyGuiTransform(p, gui)
    return {
      x: (v[0] * PROJECTION_SCALE + 0.5) * size,
      // Экранная ось Y направлена вниз.
      y: (0.5 - v[1] * PROJECTION_SCALE) * size,
      z: v[2],
    }
  }
  return draw(quads, atlas, size, project, tints)
}

export interface SceneCamera {
  /** Поворот вокруг вертикали и наклон, в градусах. */
  yaw: number
  pitch: number
  /**
   * Габариты, по которым вписывать кадр. Передаются от готовой постройки,
   * чтобы при переключении шагов модель росла, а не прыгала в масштабе.
   */
  bounds?: { min: Vec3; max: Vec3 }
}

/**
 * Рисует постройку из многих блоков изометрией.
 *
 * Тот же растеризатор, что у иконок, — это принципиально: контрольные листы
 * должны показывать ровно ту геометрию, которая уедет в браузер, иначе они
 * перестанут быть проверкой.
 */
export function renderScene(
  quads: Quad[],
  atlas: Atlas,
  size: number,
  camera: SceneCamera,
): RenderResult {
  const rotate = (p: Vec3): Vec3 => {
    let v = rotateAxis(p, 'y', camera.yaw, [0, 0, 0])
    v = rotateAxis(v, 'x', camera.pitch, [0, 0, 0])
    return v
  }

  const own = quads.flatMap((quad) => quad.pos)
  if (own.length === 0) return { data: Buffer.alloc(size * size * 4), size }

  // Кадр вписывается по габаритам готовой постройки, а не текущего шага.
  const points: Vec3[] = camera.bounds
    ? [camera.bounds.min, camera.bounds.max].flatMap(([x, y, z]) => [[x, y, z] as Vec3])
    : own
  const corners: Vec3[] = camera.bounds
    ? (() => {
        const [a, b] = [camera.bounds.min, camera.bounds.max]
        const out: Vec3[] = []
        for (const x of [a[0], b[0]]) for (const y of [a[1], b[1]]) for (const z of [a[2], b[2]]) out.push([x, y, z])
        return out
      })()
    : own

  const centre: Vec3 = [
    (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2,
    (Math.min(...points.map((p) => p[1])) + Math.max(...points.map((p) => p[1]))) / 2,
    (Math.min(...points.map((p) => p[2])) + Math.max(...points.map((p) => p[2]))) / 2,
  ]
  const rotated = corners.map((p) =>
    rotate([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]]),
  )
  const extent = Math.max(
    ...rotated.map((p) => Math.abs(p[0])),
    ...rotated.map((p) => Math.abs(p[1])),
    1,
  )
  const scale = (size * 0.46) / extent

  const project = (p: Vec3): { x: number; y: number; z: number } => {
    const v = rotate([p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]])
    return { x: size / 2 + v[0] * scale, y: size / 2 - v[1] * scale, z: v[2] }
  }
  return draw(quads, atlas, size, project, [])
}

/** Общий проход растеризации: грани → два треугольника с z-буфером. */
function draw(
  quads: Quad[],
  atlas: Atlas,
  size: number,
  project: (p: Vec3) => { x: number; y: number; z: number },
  tints: (number | null)[],
): RenderResult {
  const out = Buffer.alloc(size * size * 4)
  const depth = new Float32Array(size * size).fill(-Infinity)

  for (const quad of quads) {
    const screen = quad.pos.map(project)
    const tint =
      quad.tint !== null ? (tints[quad.tint] ?? quad.tintColor ?? null) : (quad.tintColor ?? null)
    rasterize(out, depth, size, screen, quad, [0, 1, 2], atlas, tint)
    rasterize(out, depth, size, screen, quad, [0, 2, 3], atlas, tint)
  }
  return { data: out, size }
}

function rasterize(
  out: Buffer,
  depth: Float32Array,
  size: number,
  screen: { x: number; y: number; z: number }[],
  quad: Quad,
  tri: [number, number, number],
  atlas: Atlas,
  tint: number | null,
): void {
  const [a, b, c] = tri.map((i) => screen[i]!) as [typeof screen[0], typeof screen[0], typeof screen[0]]
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
  if (Math.abs(area) < 1e-9) return

  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)))
  const maxX = Math.min(size - 1, Math.ceil(Math.max(a.x, b.x, c.x)))
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)))
  const maxY = Math.min(size - 1, Math.ceil(Math.max(a.y, b.y, c.y)))

  const uvA = quad.uv[tri[0]]!
  const uvB = quad.uv[tri[1]]!
  const uvC = quad.uv[tri[2]]!

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5
      const py = y + 0.5
      const w0 = ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y)) / area
      const w1 = ((px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y)) / area
      const w2 = 1 - w0 - w1
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue

      const z = a.z * w2 + b.z * w1 + c.z * w0
      const idx = y * size + x
      // Строгое сравнение: при равной глубине побеждает грань, нарисованная позже.
      // Так накладки поверх базового куба (трава, лоза) не тонут в z-конфликте.
      if (z < depth[idx]!) continue

      const u = (uvA[0] * w2 + uvB[0] * w1 + uvC[0] * w0) / 16
      const v = (uvA[1] * w2 + uvB[1] * w1 + uvC[1] * w0) / 16
      const texel = sampleSprite(atlas, quad.sprite, u, v)
      if (!texel || texel[3] < 16) continue

      depth[idx] = z
      out.fill(0, idx * 4, idx * 4 + 4)
      blend(out, idx * 4, texel, quad.shade, tint)
    }
  }
}

export function renderIcon(
  model: ResolvedModel,
  atlas: Atlas,
  size: number,
  tints: (number | null)[] = [],
): RenderResult | null {
  if (model.builtin === 'generated') return renderFlat(model, atlas, size, tints)
  if (model.elements.length === 0) return null
  return render3d(model, atlas, size, tints)
}
