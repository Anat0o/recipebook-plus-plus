/**
 * Дискретные распределения количества предметов.
 *
 * Считаем не симуляцией, а честной свёрткой: из распределения сразу видно
 * и матожидание, и вероятность «выпало хотя бы что-то».
 */
export type Dist = Map<number, number>

/** Предел размера носителя: дальше распределение схлопывается в среднее. */
const MAX_SUPPORT = 512

export function constant(value: number): Dist {
  return new Map([[value, 1]])
}

export function uniformInt(min: number, max: number): Dist {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  if (hi < lo) return constant(0)
  const n = hi - lo + 1
  const dist: Dist = new Map()
  for (let v = lo; v <= hi; v++) dist.set(v, 1 / n)
  return dist
}

export function binomial(n: number, p: number): Dist {
  const dist: Dist = new Map()
  let coeff = 1
  for (let k = 0; k <= n; k++) {
    dist.set(k, coeff * p ** k * (1 - p) ** (n - k))
    coeff = (coeff * (n - k)) / (k + 1)
  }
  return dist
}

export function mean(dist: Dist): number {
  let sum = 0
  for (const [value, p] of dist) sum += value * p
  return sum
}

/** Вероятность, что количество больше нуля. */
export function pPositive(dist: Dist): number {
  let p = 0
  for (const [value, prob] of dist) if (value > 0) p += prob
  return p
}

function normalize(dist: Dist): Dist {
  if (dist.size <= MAX_SUPPORT) return dist
  // Носитель разросся — заменяем распределение точкой в среднем,
  // сохраняя вероятность нуля, чтобы шанс выпадения остался осмысленным.
  const zero = dist.get(0) ?? 0
  const m = mean(dist)
  if (zero === 0 || zero === 1) return constant(m)
  return new Map([
    [0, zero],
    [m / (1 - zero), 1 - zero],
  ])
}

/** Сумма двух независимых величин. */
export function add(a: Dist, b: Dist): Dist {
  const out: Dist = new Map()
  for (const [va, pa] of a) {
    for (const [vb, pb] of b) {
      out.set(va + vb, (out.get(va + vb) ?? 0) + pa * pb)
    }
  }
  return normalize(out)
}

/** Произведение двух независимых величин. */
export function multiply(a: Dist, b: Dist): Dist {
  const out: Dist = new Map()
  for (const [va, pa] of a) {
    for (const [vb, pb] of b) {
      out.set(va * vb, (out.get(va * vb) ?? 0) + pa * pb)
    }
  }
  return normalize(out)
}

export function mapValues(dist: Dist, fn: (v: number) => number): Dist {
  const out: Dist = new Map()
  for (const [value, p] of dist) {
    const mapped = fn(value)
    out.set(mapped, (out.get(mapped) ?? 0) + p)
  }
  return out
}

/** Обрезает отрицательные количества — игра не выдаёт минус предметов. */
export function clampNonNegative(dist: Dist): Dist {
  return mapValues(dist, (v) => Math.max(0, Math.floor(v)))
}

/** Масштабирует вероятности: событие происходит лишь с вероятностью p. */
export function withProbability(dist: Dist, p: number): Dist {
  if (p >= 1) return dist
  const out: Dist = new Map([[0, 1 - p]])
  for (const [value, prob] of dist) out.set(value, (out.get(value) ?? 0) + prob * p)
  return out
}

/** Повторение независимых попыток: сумма n одинаковых величин. */
export function repeat(dist: Dist, times: number): Dist {
  if (times <= 0) return constant(0)
  const whole = Math.floor(times)
  let out = constant(0)
  for (let i = 0; i < whole; i++) out = add(out, dist)
  const fraction = times - whole
  return fraction > 0 ? add(out, withProbability(dist, fraction)) : out
}
