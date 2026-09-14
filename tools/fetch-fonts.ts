/**
 * Скачивает пиксельный шрифт Monocraft (лицензия OFL) и кладёт его в public/fonts.
 *
 * Оригинальный шрифт Minecraft проприетарный, поэтому берём открытый аналог.
 * Кириллицу Monocraft покрывает полностью — русские подписи в контентном слое
 * тоже пиксельные (проверено рендером в браузере).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { compress } from 'wawoff2'

const RELEASE = 'https://github.com/IdreesInc/Monocraft/releases/latest/download/Monocraft-ttf.zip'
const OUT_DIR = 'public/fonts'
const OUT_FILE = join(OUT_DIR, 'Monocraft.woff2')
const TEMP_DIR = 'tools/.font-cache'

if (existsSync(OUT_FILE)) {
  console.log('Monocraft уже на месте.')
  process.exit(0)
}

mkdirSync(TEMP_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const zip = join(TEMP_DIR, 'monocraft.zip')
console.log('скачиваю Monocraft…')
execFileSync('curl', ['-sL', '-o', zip, RELEASE])
execFileSync('unzip', ['-o', '-q', zip, '-d', TEMP_DIR])

// Архив распаковывается в подпапку, поэтому ищем файл рекурсивно.
function findTtf(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = findTtf(path)
      if (nested) return nested
    } else if (/^Monocraft(-Regular)?\.ttf$/i.test(entry.name)) {
      return path
    }
  }
  return null
}

const ttf = findTtf(TEMP_DIR)
if (!ttf) throw new Error('в архиве не нашлось Monocraft.ttf')

console.log(`конвертирую ${ttf} → woff2…`)
const woff2 = await compress(readFileSync(ttf))
writeFileSync(OUT_FILE, woff2)
rmSync(TEMP_DIR, { recursive: true, force: true })
console.log(`готово: ${OUT_FILE}, ${(woff2.length / 1024).toFixed(0)} КБ`)
