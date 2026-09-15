/**
 * Минимальный рендер построек Minecraft на WebGL.
 *
 * Библиотеки здесь нет намеренно: геометрия — это осепараллельные коробки с
 * готовыми UV, свет — четыре константы яркости граней из игры, камера — орбита.
 * Всё вместе укладывается в несколько килобайт, тогда как готовый движок стоил
 * бы больше, чем весь остальной сайт.
 *
 * Модели разобраны на сборке: сюда приходит готовый список граней.
 */

export interface BlockFace {
  pos: number[]
  uv: number[]
  tex: number
  shade: number
  tint?: number
  cull?: string
}

export interface BlockMesh {
  /** Ключ вида `hopper^east`: блок вместе с направлением. */
  id: string
  faces: BlockFace[]
  translucent?: boolean
}

export interface BlockData {
  file: string
  tile: number
  cols: number
  atlasWidth: number
  atlasHeight: number
  /** Сплошная белая плитка: по ней рисуется опора вида. */
  whiteTile: number
  /** Текстуры сущностей в том же атласе: тип → номер плитки. */
  entityTextures?: Record<string, number>
  blocks: BlockMesh[]
}

export interface Placement {
  x: number
  y: number
  z: number
  block: string
  facing?: string
  /** Форма блока по соседям: у пыли это стороны, в которые она тянется. */
  variant?: string
  /** В режиме разреза оболочка становится полупрозрачной. */
  shell?: boolean
  /** Начальное содержимое нужно симулятору; рендер геометрии его игнорирует. */
  inventory?: { id: string; count: number; key?: string }[]
  step: number
}

export interface SceneEntity {
  id: string
  type: string
  x: number
  y: number
  z: number
  facing?: string
  scale?: number
  step?: number
  variant?: string
  visible?: boolean
}

/** Ключ геометрии: блок вместе с направлением и формой. */
function meshKey(placement: Placement): string {
  const facing = placement.facing ? `^${placement.facing}` : ''
  const variant = placement.variant ? `#${placement.variant}` : ''
  return `${placement.block}${facing}${variant}`
}

/** Стороны блока и их смещения — по ним прячут внутренние грани. */
const NEIGHBOUR: Record<string, [number, number, number]> = {
  down: [0, -1, 0],
  up: [0, 1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
}

const VERTEX_SOURCE = `
attribute vec3 aPos;
attribute vec2 aUv;
attribute vec4 aColor;
uniform mat4 uMvp;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  gl_Position = uMvp * vec4(aPos, 1.0);
  vUv = aUv;
  vColor = aColor;
}`

const FRAGMENT_SOURCE = `
precision mediump float;
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 texel = texture2D(uAtlas, vUv);
  // Прозрачные пиксели текстуры выбрасываем: иначе стекло и лианы
  // оставляли бы серые прямоугольники.
  if (texel.a < 0.1) discard;
  gl_FragColor = vec4(texel.rgb * vColor.rgb, texel.a * vColor.a);
}`

/** Восемь чисел на вершину: позиция, UV, цвет с прозрачностью. */
const STRIDE = 9

interface Batch {
  data: Float32Array
  count: number
}

export interface Bounds {
  min: [number, number, number]
  max: [number, number, number]
}

/**
 * Опорная плоскость под постройкой.
 *
 * Провод и повторители в игре лежат на поверхности, и без неё схема выглядит
 * висящей в воздухе. Плоскость намеренно однотонная: это подложка вида,
 * а не блок, который читателю нужно ставить.
 */
function buildGround(data: BlockData, bounds: Bounds): Batch {
  const margin = 0.5
  const [x1, z1] = [bounds.min[0] - margin, bounds.min[2] - margin]
  const [x2, z2] = [bounds.max[0] + margin, bounds.max[2] + margin]
  // Чуть ниже пола постройки, чтобы не спорить за глубину с пылью.
  const y = bounds.min[1] - 0.02
  const shade = 0.26

  // Сплошная белая плитка атласа: цвет задаётся вершинами, а не текстурой.
  const tileU = data.tile / data.atlasWidth
  const tileV = data.tile / data.atlasHeight
  const u = (data.whiteTile % data.cols + 0.5) * tileU
  const v = (Math.floor(data.whiteTile / data.cols) + 0.5) * tileV

  const vertices: number[] = []
  const corner = (x: number, z: number): void => {
    vertices.push(x, y, z, u, v, shade, shade, shade * 1.05, 0.9)
  }
  corner(x1, z1); corner(x1, z2); corner(x2, z2)
  corner(x1, z1); corner(x2, z2); corner(x2, z1)

  return { data: new Float32Array(vertices), count: vertices.length / STRIDE }
}

/** Габариты постройки в блоках — по ним камера вписывает кадр. */
export function boundsOf(placements: Placement[]): Bounds {
  if (placements.length === 0) return { min: [0, 0, 0], max: [1, 1, 1] }
  const xs = placements.map((p) => p.x)
  const ys = placements.map((p) => p.y)
  const zs = placements.map((p) => p.z)
  return {
    min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)],
    max: [Math.max(...xs) + 1, Math.max(...ys) + 1, Math.max(...zs) + 1],
  }
}

/**
 * Собирает вершины постройки.
 *
 * Грани, к которым вплотную стоит соседний блок, не попадают в буфер: внутри
 * постройки они всё равно не видны, а сквозь полупрозрачные блоки прошлых
 * шагов просвечивали бы.
 */
function buildBatch(
  data: BlockData,
  placements: Placement[],
  alpha: number,
  occupied: Set<string>,
): Batch {
  const meshes = new Map(data.blocks.map((block) => [block.id, block]))
  const vertices: number[] = []
  const tileU = data.tile / data.atlasWidth
  const tileV = data.tile / data.atlasHeight
  // Полтекселя внутрь: при NEAREST выборка по краю цепляет соседнюю плитку.
  const inset = 0.5 / data.tile

  for (const placement of placements) {
    // Геометрия уже повёрнута на сборке по блоксостоянию игры: повторять
    // таблицу поворотов в браузере значит завести второй источник правды.
    const mesh = meshes.get(meshKey(placement))
    if (!mesh) continue

    for (const face of mesh.faces) {
      if (face.cull) {
        const offset = NEIGHBOUR[face.cull]
        if (offset) {
          const key = `${placement.x + offset[0]},${placement.y + offset[1]},${placement.z + offset[2]}`
          if (occupied.has(key)) continue
        }
      }

      const tintColor = face.tint
      const r = ((tintColor === undefined ? 0xffffff : tintColor) >> 16 & 0xff) / 255 * face.shade
      const g = ((tintColor === undefined ? 0xffffff : tintColor) >> 8 & 0xff) / 255 * face.shade
      const b = ((tintColor === undefined ? 0xffffff : tintColor) & 0xff) / 255 * face.shade

      const col = face.tex % data.cols
      const row = Math.floor(face.tex / data.cols)

      const corner = (index: number): number[] => {
        const p: [number, number, number] = [
          face.pos[index * 3]!,
          face.pos[index * 3 + 1]!,
          face.pos[index * 3 + 2]!,
        ]
        const u = face.uv[index * 2]! / 16
        const v = face.uv[index * 2 + 1]! / 16
        return [
          p[0] / 16 + placement.x,
          p[1] / 16 + placement.y,
          p[2] / 16 + placement.z,
          (col + Math.min(Math.max(u, inset), 1 - inset)) * tileU,
          (row + Math.min(Math.max(v, inset), 1 - inset)) * tileV,
          r, g, b, alpha,
        ]
      }

      // Квад → два треугольника.
      for (const index of [0, 1, 2, 0, 2, 3]) vertices.push(...corner(index))
    }
  }

  return { data: new Float32Array(vertices), count: vertices.length / STRIDE }
}

/** Кубоидные сущности: лёгкие, но объёмные и с текстурами текущей версии. */
function buildEntityBatch(data: BlockData, entities: SceneEntity[]): Batch {
  const vertices: number[] = []
  const tileU = data.tile / data.atlasWidth
  const tileV = data.tile / data.atlasHeight
  const pushBox = (
    entity: SceneEntity,
    box: [number, number, number, number, number, number],
    uv: [number, number, number, number],
  ): void => {
    const tex = data.entityTextures?.[entity.type] ?? data.whiteTile
    const col = tex % data.cols
    const row = Math.floor(tex / data.cols)
    const scale = entity.scale ?? 1
    const [x1, y1, z1, x2, y2, z2] = box.map((n) => n * scale) as typeof box
    const cx = entity.x + 0.5
    const cz = entity.z + 0.5
    const [u1, v1, u2, v2] = uv
    const faces: { p: number[][]; shade: number }[] = [
      { p: [[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]], shade: 1 },
      { p: [[x2,y1,z1],[x1,y1,z1],[x1,y2,z1],[x2,y2,z1]], shade: .78 },
      { p: [[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]], shade: .86 },
      { p: [[x2,y1,z2],[x2,y1,z1],[x2,y2,z1],[x2,y2,z2]], shade: .72 },
      { p: [[x1,y2,z2],[x2,y2,z2],[x2,y2,z1],[x1,y2,z1]], shade: 1.08 },
      { p: [[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]], shade: .62 },
    ]
    for (const face of faces) {
      const corners = face.p.map(([x,y,z], i) => [
        cx + x!, entity.y + y!, cz + z!,
        (col + (i === 1 || i === 2 ? u2 : u1) / 64) * tileU,
        (row + (i >= 2 ? v2 : v1) / 64) * tileV,
        face.shade, face.shade, face.shade, 1,
      ])
      for (const index of [0, 1, 2, 0, 2, 3]) vertices.push(...corners[index]!)
    }
  }

  for (const entity of entities.filter((e) => e.visible !== false)) {
    if (entity.type === 'item') {
      pushBox(entity, [-.35, .1, -.35, .35, .8, .35], [0, 0, 16, 16])
      continue
    }
    if (entity.type === 'hopper_minecart') {
      pushBox(entity, [-.7, .05, -.45, .7, .48, .45], [0, 0, 32, 16])
      pushBox(entity, [-.42, .32, -.32, .42, .78, .32], [0, 0, 16, 16])
      continue
    }
    const humanoid = !['chicken', 'bee', 'cat', 'spider'].includes(entity.type)
    if (humanoid) {
      const tall = entity.type === 'iron_golem' ? 1.35 : 1
      pushBox(entity, [-.26, 1.3 * tall, -.26, .26, 1.82 * tall, .26], [8, 8, 16, 16])
      pushBox(entity, [-.27, .62 * tall, -.18, .27, 1.3 * tall, .18], [20, 20, 28, 32])
      pushBox(entity, [-.25, 0, -.14, -.03, .65 * tall, .14], [0, 20, 8, 32])
      pushBox(entity, [.03, 0, -.14, .25, .65 * tall, .14], [0, 20, 8, 32])
      if (entity.type === 'villager') {
        pushBox(entity, [-.12, .84, -.3, .12, 1.28, -.18], [24, 38, 28, 46])
      }
    } else if (entity.type === 'spider') {
      pushBox(entity, [-.7, .15, -.45, .7, .55, .45], [0, 0, 16, 16])
      pushBox(entity, [-.42, .28, -.7, .42, .68, -.35], [0, 0, 16, 16])
    } else if (entity.type === 'bee') {
      pushBox(entity, [-.35, .55, -.3, .35, 1.05, .3], [0, 0, 16, 16])
    } else {
      pushBox(entity, [-.38, .28, -.45, .38, .92, .45], [0, 0, 16, 16])
      pushBox(entity, [-.28, .78, -.58, .28, 1.25, -.18], [0, 0, 16, 16])
    }
  }
  return { data: new Float32Array(vertices), count: vertices.length / STRIDE }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'шейдер не скомпилировался')
  }
  return shader
}

/**
 * Умножение матриц 4×4 в столбцовом хранении OpenGL.
 *
 * Порядок аргументов обратный привычному: `multiply(view, projection)` даёт
 * матрицу, применяющую сначала вид, потом проекцию. Проверено численно —
 * перепутанный порядок отправляет всю сцену за пределы кадра, и холст
 * остаётся пустым без единой ошибки в консоли.
 */
function multiply(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) out[i * 4 + j] += a[i * 4 + k]! * b[k * 4 + j]!
    }
  }
  return out
}

function perspective(fov: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fov / 2)
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]
}

function lookAt(eye: number[], target: number[], up: number[]): number[] {
  const z = normalise([eye[0]! - target[0]!, eye[1]! - target[1]!, eye[2]! - target[2]!])
  const x = normalise(cross(up, z))
  const y = cross(z, x)
  return [
    x[0]!, y[0]!, z[0]!, 0,
    x[1]!, y[1]!, z[1]!, 0,
    x[2]!, y[2]!, z[2]!, 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]
}

const cross = (a: number[], b: number[]): number[] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
]
const dot = (a: number[], b: number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!
const normalise = (v: number[]): number[] => {
  const length = Math.hypot(v[0]!, v[1]!, v[2]!) || 1
  return [v[0]! / length, v[1]! / length, v[2]! / length]
}

export interface View {
  yaw: number
  pitch: number
  zoom: number
}

export const DEFAULT_VIEW: View = { yaw: 35, pitch: 28, zoom: 1 }

/** Живой рендер одной постройки. */
export class BuildRenderer {
  private readonly gl: WebGLRenderingContext
  private readonly program: WebGLProgram
  private readonly buffer: WebGLBuffer
  private readonly texture: WebGLTexture
  private solid: Batch = { data: new Float32Array(), count: 0 }
  private ghost: Batch = { data: new Float32Array(), count: 0 }
  private ground: Batch = { data: new Float32Array(), count: 0 }
  private entities: Batch = { data: new Float32Array(), count: 0 }
  private bounds: Bounds = { min: [0, 0, 0], max: [1, 1, 1] }

  constructor(canvas: HTMLCanvasElement, atlas: TexImageSource) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      // Без этого браузер очищает буфер сразу после вывода, и холст нельзя
      // ни прочитать, ни сохранить картинкой — а на телефоне это привычный жест.
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('WebGL недоступен')
    this.gl = gl

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'программа не собралась')
    }
    this.program = program
    this.buffer = gl.createBuffer()!

    // Пиксель в пиксель, как в игре: никакого сглаживания и мипмапов.
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    // Отсечение по обходу выключено намеренно: у моделей игры обход граней
    // обратный к принятому в GL, а посевы, рельсы и редстоуновая пыль —
    // вообще двусторонние плоскости и видны с обеих сторон.
    gl.disable(gl.CULL_FACE)
  }

  /**
   * Готовит постройку к показу.
   *
   * На шаге сборки блоки этого шага плотные, поставленные раньше —
   * полупрозрачные. На готовом результате плотное всё: это отдельный вид,
   * ради которого постройку и собирали.
   */
  setStep(data: BlockData, placements: Placement[], step: number, showAll = false): void {
    this.setScene(data, placements, [], step, showAll, false)
  }

  setScene(
    data: BlockData,
    placements: Placement[],
    entities: SceneEntity[],
    step: number,
    showAll = false,
    cutaway = false,
  ): void {
    const visible = showAll ? placements : placements.filter((p) => p.step <= step)
    const occupied = new Set(visible.map((p) => `${p.x},${p.y},${p.z}`))
    const solid = showAll ? visible.filter((p) => !cutaway || !p.shell) : visible.filter((p) => p.step === step)
    const ghost = showAll
      ? (cutaway ? visible.filter((p) => p.shell) : [])
      : visible.filter((p) => p.step < step)
    this.solid = buildBatch(data, solid, 1, occupied)
    this.ghost = buildBatch(data, ghost, 0.45, occupied)
    this.entities = buildEntityBatch(
      data,
      entities.filter((entity) => showAll || (entity.step ?? 1) <= step),
    )
    this.bounds = boundsOf([
      ...placements,
      ...entities.map((entity) => ({ ...entity, block: '', step: entity.step ?? 1 })),
    ])
    this.ground = buildGround(data, this.bounds)
  }

  draw(view: View): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    const centre = [
      (this.bounds.min[0] + this.bounds.max[0]) / 2,
      (this.bounds.min[1] + this.bounds.max[1]) / 2,
      (this.bounds.min[2] + this.bounds.max[2]) / 2,
    ]
    const span = [0, 1, 2].map((i) => this.bounds.max[i]! - this.bounds.min[i]!)
    const size = Math.max(...span, 1)

    const yaw = (view.yaw * Math.PI) / 180
    const pitch = (view.pitch * Math.PI) / 180

    // Кадрируем честно: по высоте и по наибольшей горизонтали при любом
    // повороте, иначе широкая ферма то не влезает, то теряется в пустоте.
    const canvasAspect = (canvas.width / canvas.height) || 1
    const half = Math.tan(Math.PI / 10)
    const horizontal = Math.hypot(span[0]!, span[2]!)
    const distance =
      (Math.max(span[1]! / 2 / half, horizontal / 2 / (half * canvasAspect)) * 1.25) / view.zoom
    const eye = [
      centre[0]! + distance * Math.cos(pitch) * Math.sin(yaw),
      centre[1]! + distance * Math.sin(pitch),
      centre[2]! + distance * Math.cos(pitch) * Math.cos(yaw),
    ]

    const mvp = multiply(
      lookAt(eye, centre, [0, 1, 0]),
      perspective(Math.PI / 5, canvasAspect, 0.1, distance + size * 4),
    )

    gl.useProgram(this.program)
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uMvp'), false, new Float32Array(mvp))
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(gl.getUniformLocation(this.program, 'uAtlas'), 0)

    // Сначала опора: без неё плоский редстоун-узел висит в пустоте, хотя
    // в игре он лежит на земле. Это подложка вида, а не блок постройки,
    // поэтому она однотонная и в список материалов не попадает.
    gl.depthMask(true)
    this.drawBatch(this.ground)
    this.drawBatch(this.solid)
    this.drawBatch(this.entities)
    gl.depthMask(false)
    this.drawBatch(this.ghost)
    gl.depthMask(true)
  }

  private drawBatch(batch: Batch): void {
    if (batch.count === 0) return
    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, batch.data, gl.DYNAMIC_DRAW)

    const bytes = STRIDE * 4
    const bind = (name: string, size: number, offset: number): void => {
      const location = gl.getAttribLocation(this.program, name)
      if (location < 0) return
      gl.enableVertexAttribArray(location)
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, bytes, offset * 4)
    }
    bind('aPos', 3, 0)
    bind('aUv', 2, 3)
    bind('aColor', 4, 5)

    gl.drawArrays(gl.TRIANGLES, 0, batch.count)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteBuffer(this.buffer)
    gl.deleteTexture(this.texture)
    gl.deleteProgram(this.program)
  }
}
