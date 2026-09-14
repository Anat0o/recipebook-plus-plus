/**
 * Контраст текста считается по токенам темы, а не проверяется на глаз.
 *
 * Пиксельный шрифт особенно чувствителен к слабому контрасту: тонкие штрихи
 * пропадают раньше, чем у обычного. Поэтому нижняя граница — 4.5:1 из WCAG AA,
 * и она закреплена тестом, чтобы не сползла при следующей правке палитры.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const MIN_RATIO = 4.5
/** Пиксельный шрифт ниже 12 px теряет форму букв. */
const MIN_FONT_PX = 12

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Значения токенов из блока `:root` — светлая тема. */
function lightTokens(): Record<string, string> {
  const block = css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)'))
  return parseTokens(block)
}

/** Значения из блока тёмной темы, поверх светлых. */
function darkTokens(): Record<string, string> {
  const start = css.indexOf('@media (prefers-color-scheme: dark)')
  const block = css.slice(start, css.indexOf('@media (prefers-reduced-transparency', start))
  return { ...lightTokens(), ...parseTokens(block) }
}

function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim()
  }
  return tokens
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  const channels = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff].map((raw) => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Текст на панели GUI — самая частая пара во всём интерфейсе. */
const ON_SURFACE = ['--mc-text-strong', '--mc-text', '--mc-text-dim', '--mc-text-faint', '--mc-accent', '--mc-highlight']

describe.each([
  ['светлая тема', lightTokens()],
  ['тёмная тема', darkTokens()],
])('%s', (_name, tokens) => {
  it.each(ON_SURFACE)('%s читается на панели', (token) => {
    const color = tokens[token]
    const surface = tokens['--mc-surface']
    expect(color, token).toMatch(/^#[0-9a-f]{6}$/i)
    expect(ratio(color!, surface!)).toBeGreaterThanOrEqual(MIN_RATIO)
  })

  it('текст на вдавленной поверхности читается', () => {
    // Слоты и поля ввода темнее панели — проверяем отдельно.
    expect(ratio(tokens['--mc-text-on-dark']!, tokens['--mc-slot']!)).toBeGreaterThanOrEqual(MIN_RATIO)
  })
})

describe('размеры текста', () => {
  it.each(['--text-caption2', '--text-caption1', '--text-footnote'])('%s не мельче 12 px', (token) => {
    const value = lightTokens()[token]
    expect(value, token).toMatch(/rem$/)
    expect(Number.parseFloat(value!) * 16).toBeGreaterThanOrEqual(MIN_FONT_PX)
  })
})
