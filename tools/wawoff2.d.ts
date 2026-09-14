/** У wawoff2 нет собственных типов — объявляем минимально нужное. */
declare module 'wawoff2' {
  export function compress(input: Uint8Array): Promise<Uint8Array>
  export function decompress(input: Uint8Array): Promise<Uint8Array>
}
