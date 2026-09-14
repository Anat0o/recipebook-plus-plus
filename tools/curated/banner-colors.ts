/**
 * Цвета красителей Minecraft.
 *
 * Это значения `textureDiffuseColor` из перечисления DyeColor: ими игра тонирует
 * маски узоров баннера. В данных их нет — они заданы в коде игры, поэтому список
 * ведётся вручную и сверяется с реестром при сборке.
 */

export const VERIFIED_FOR = ['26.2', '26.1.2', '1.21.11']

/** Порядок как в игре: от белого к чёрному. */
export const DYE_COLORS: Record<string, string> = {
  white: '#f9fffe',
  light_gray: '#9d9d97',
  gray: '#474f52',
  black: '#1d1d21',
  brown: '#835432',
  red: '#b02e26',
  orange: '#f9801d',
  yellow: '#fed83d',
  lime: '#80c71f',
  green: '#5e7c16',
  cyan: '#169c9c',
  light_blue: '#3ab3da',
  blue: '#3c44aa',
  purple: '#8932b8',
  magenta: '#c74ebd',
  pink: '#f38baa',
}

export const COLOR_ORDER = Object.keys(DYE_COLORS)

/** Предмет-краситель для цвета. */
export function dyeItem(color: string): string {
  return `${color}_dye`
}

/** Предмет-баннер для цвета. */
export function bannerItem(color: string): string {
  return `${color}_banner`
}
