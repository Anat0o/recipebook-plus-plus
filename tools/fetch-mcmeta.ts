/**
 * Выкачивает нужные срезы данных Minecraft из misode/mcmeta.
 *
 * Использует partial clone (`--filter=blob:none`) + sparse checkout, чтобы не тянуть
 * worldgen и структуры: полный `data-json` весит десятки мегабайт, нам нужна
 * малая его часть. Результат кэшируется в tools/.mcmeta-cache/<версия>/<ветка>.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MCMETA_SOURCES, VERSIONS, type McmetaSource } from './config.ts'

const REPO = 'https://github.com/misode/mcmeta'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CACHE_DIR = join(ROOT, 'tools', '.mcmeta-cache')

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Путь к рабочей копии конкретной ветки конкретной версии. */
export function sourceDir(version: string, source: McmetaSource): string {
  return join(CACHE_DIR, version, source)
}

function fetchSource(version: string, source: McmetaSource): void {
  const tag = `${version}-${source}`
  const dir = sourceDir(version, source)
  const stamp = join(dir, '.fetched')
  // Набор путей входит в отпечаток: расширили sparse-checkout — кэш протух.
  const paths = MCMETA_SOURCES[source]
  const fingerprint = `${tag} ${createHash('sha256').update(paths.join('\0')).digest('hex').slice(0, 12)}`

  if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === fingerprint) {
    console.log(`  ${tag}: уже в кэше`)
    return
  }

  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dirname(dir), { recursive: true })

  console.log(`  ${tag}: клонирую…`)
  git([
    'clone',
    '--depth', '1',
    '--filter=blob:none',
    '--sparse',
    '--single-branch',
    '--branch', tag,
    REPO,
    dir,
  ])
  git(['sparse-checkout', 'set', '--no-cone', ...paths], dir)

  writeFileSync(stamp, `${fingerprint}\n`)
}

export function fetchAll(versions = VERSIONS.map((v) => v.id)): void {
  for (const version of versions) {
    console.log(`Версия ${version}:`)
    for (const source of Object.keys(MCMETA_SOURCES) as McmetaSource[]) {
      fetchSource(version, source)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  fetchAll(requested.length > 0 ? requested : undefined)
  console.log('Готово.')
}
