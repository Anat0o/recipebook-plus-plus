/**
 * Геометрия моделей Minecraft: элементы модели → грани с координатами и UV.
 *
 * Этим пользуются трое: рендер иконок предметов, сборка 3D-схем для сайта и
 * контрольные листы. Общий модуль здесь не ради экономии строк, а чтобы все
 * трое рисовали одно и то же — иначе превью перестанет быть проверкой.
 */
import type { ModelElement, FaceName, Vec3 } from './models.ts'
import { FACES } from './models.ts'

/** Одна грань, готовая к отрисовке: позиции 0…16, UV 0…16, имя текстуры. */
export type Quad = {
  pos: Vec3[]
  uv: [number, number][]
  sprite: string
  shade: number
  tint: number | null
  /** Сторона блока, к которой грань прилегает: по ней прячут внутренние грани. */
  cullface?: FaceName
  /** Готовый цвет тонировки — им пользуются схемы, где биом неизвестен. */
  tintColor?: number
}

/** Яркость грани по её направлению — та же таблица, что у блоков в мире. */
export const FACE_SHADE: Record<FaceName, number> = {
  up: 1.0,
  down: 0.5,
  north: 0.8,
  south: 0.8,
  west: 0.6,
  east: 0.6,
}

/** Углы грани при взгляде снаружи: [верх-лево, низ-лево, низ-право, верх-право]. */
export function faceCorners(face: FaceName, f: Vec3, t: Vec3): Vec3[] {
  switch (face) {
    case 'up':    return [[f[0], t[1], f[2]], [f[0], t[1], t[2]], [t[0], t[1], t[2]], [t[0], t[1], f[2]]]
    case 'down':  return [[f[0], f[1], t[2]], [f[0], f[1], f[2]], [t[0], f[1], f[2]], [t[0], f[1], t[2]]]
    case 'north': return [[t[0], t[1], f[2]], [t[0], f[1], f[2]], [f[0], f[1], f[2]], [f[0], t[1], f[2]]]
    case 'south': return [[f[0], t[1], t[2]], [f[0], f[1], t[2]], [t[0], f[1], t[2]], [t[0], t[1], t[2]]]
    case 'west':  return [[f[0], t[1], f[2]], [f[0], f[1], f[2]], [f[0], f[1], t[2]], [f[0], t[1], t[2]]]
    case 'east':  return [[t[0], t[1], t[2]], [t[0], f[1], t[2]], [t[0], f[1], f[2]], [t[0], t[1], f[2]]]
  }
}

/** UV по умолчанию, если грань их не задаёт (правила ванильного BlockElement). */
export function defaultUv(face: FaceName, f: Vec3, t: Vec3): [number, number, number, number] {
  switch (face) {
    case 'up':    return [f[0], f[2], t[0], t[2]]
    case 'down':  return [f[0], 16 - t[2], t[0], 16 - f[2]]
    case 'north': return [16 - t[0], 16 - t[1], 16 - f[0], 16 - f[1]]
    case 'south': return [f[0], 16 - t[1], t[0], 16 - f[1]]
    case 'west':  return [f[2], 16 - t[1], t[2], 16 - f[1]]
    case 'east':  return [16 - t[2], 16 - t[1], 16 - f[2], 16 - f[1]]
  }
}

export function rotateAxis(p: Vec3, axis: 'x' | 'y' | 'z', deg: number, origin: Vec3): Vec3 {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const [x, y, z] = [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]]
  const r: Vec3 =
    axis === 'x' ? [x, y * c - z * s, y * s + z * c]
    : axis === 'y' ? [x * c + z * s, y, -x * s + z * c]
    : [x * c - y * s, x * s + y * c, z]
  return [r[0] + origin[0], r[1] + origin[1], r[2] + origin[2]]
}

export function buildQuads(elements: ModelElement[], textures: Record<string, string>): Quad[] {
  const quads: Quad[] = []
  for (const el of elements) {
    for (const face of FACES) {
      const def = el.faces[face]
      if (!def) continue
      const texRef = def.texture.startsWith('#') ? textures[def.texture.slice(1)] : def.texture
      if (!texRef) continue

      let pos = faceCorners(face, el.from, el.to)
      if (el.rotation) {
        const { origin, axis, angle } = el.rotation
        pos = pos.map((p) => rotateAxis(p, axis, angle, origin))
      }

      const [u1, v1, u2, v2] = def.uv ?? defaultUv(face, el.from, el.to)
      let uv: [number, number][] = [[u1, v1], [u1, v2], [u2, v2], [u2, v1]]
      const steps = ((def.rotation ?? 0) / 90) % 4
      for (let i = 0; i < steps; i++) uv = [uv[3]!, uv[0]!, uv[1]!, uv[2]!]

      quads.push({
        pos,
        uv,
        sprite: texRef.replace(/^minecraft:/, ''),
        shade: el.shade === false ? 1 : FACE_SHADE[face],
        tint: def.tintindex ?? null,
        cullface: def.cullface as FaceName | undefined,
      })
    }
  }
  return quads
}


/**
 * Ставит блок в мир: поворачивает грани вокруг его центра и сдвигает.
 *
 * `rotation` — это углы **из блоксостояния игры**, и отсчитываются они в
 * противоположную сторону относительно `rotateAxis`, поэтому знак меняется
 * здесь. Без этого восток менялся местами с западом, а верх с низом, тогда
 * как север и юг оставались верными: 0° и 180° от смены знака не меняются —
 * из-за этого ошибка и пережила просмотр контрольных листов глазами.
 *
 * Менять сам `rotateAxis` нельзя: на нём же держатся display-трансформации
 * иконок предметов, и там соглашение своё.
 */
export function placeQuads(
  quads: Quad[],
  position: { x: number; y: number; z: number },
  rotation: { x: number; y: number },
): Quad[] {
  const centre: Vec3 = [8, 8, 8]
  return quads.map((quad) => ({
    ...quad,
    pos: quad.pos.map((p) => {
      let v: Vec3 = [p[0], p[1], p[2]]
      if (rotation.x) v = rotateAxis(v, 'x', -rotation.x, centre)
      if (rotation.y) v = rotateAxis(v, 'y', -rotation.y, centre)
      return [v[0] + position.x * 16, v[1] + position.y * 16, v[2] + position.z * 16] as Vec3
    }),
  }))
}
