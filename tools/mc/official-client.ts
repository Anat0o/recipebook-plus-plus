/**
 * Минимальный кэш официального client JAR.
 *
 * mcmeta даёт JSON и общий атлас, но не хранит исходные маски отделки брони.
 * Их нельзя угадывать: скачиваем официальный JAR по Mojang manifest, проверяем
 * SHA-1 и извлекаем только две текстуры брони, маски узоров и палитры.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(ROOT, 'tools', '.client-cache')
const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const DOWNLOAD_ATTEMPTS = 3
const DOWNLOAD_TIMEOUT_MS = 60_000

interface Download {
  sha1: string
  size: number
  url: string
}

async function fetchWithRetry(url: string, label: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
      if (response.ok || response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < DOWNLOAD_ATTEMPTS) {
      console.warn(`  ${label}: попытка ${attempt} не удалась, повторяю…`)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000))
    }
  }
  throw new Error(`${label}: загрузка не удалась после ${DOWNLOAD_ATTEMPTS} попыток`, { cause: lastError })
}

async function json<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url, 'метаданные Mojang')
  if (!response.ok) throw new Error(`Mojang metadata ${response.status}: ${url}`)
  return response.json() as Promise<T>
}

function sha1(data: Buffer): string {
  return createHash('sha1').update(data).digest('hex')
}

async function clientDownload(version: string): Promise<Download> {
  const manifest = await json<{ versions: { id: string; url: string }[] }>(MANIFEST)
  const entry = manifest.versions.find((candidate) => candidate.id === version)
  if (!entry) throw new Error(`официальный manifest не содержит Minecraft ${version}`)
  const metadata = await json<{ downloads: { client?: Download } }>(entry.url)
  if (!metadata.downloads.client) throw new Error(`у Minecraft ${version} нет client JAR`)
  return metadata.downloads.client
}

async function ensureJar(version: string): Promise<{ jar: string; hash: string }> {
  const download = await clientDownload(version)
  const dir = join(CACHE, version)
  const jar = join(dir, 'client.jar')
  mkdirSync(dir, { recursive: true })

  if (existsSync(jar)) {
    const current = readFileSync(jar)
    if (current.length === download.size && sha1(current) === download.sha1) {
      return { jar, hash: download.sha1 }
    }
  }

  const response = await fetchWithRetry(download.url, `client JAR ${version}`)
  if (!response.ok) throw new Error(`client JAR ${version}: HTTP ${response.status}`)
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length !== download.size || sha1(data) !== download.sha1) {
    throw new Error(`client JAR ${version}: размер или SHA-1 не совпадает с manifest`)
  }
  const temporary = `${jar}.part`
  writeFileSync(temporary, data)
  renameSync(temporary, jar)
  return { jar, hash: download.sha1 }
}

/** Папка assets/minecraft с извлечёнными официальными текстурами брони. */
export async function officialArmorAssets(version: string): Promise<string> {
  const { jar, hash } = await ensureJar(version)
  const root = join(CACHE, version, 'armor-assets')
  const stamp = join(root, '.source-sha1')
  if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === hash) {
    return join(root, 'assets', 'minecraft')
  }

  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  execFileSync('unzip', [
    '-oq', jar,
    'assets/minecraft/textures/entity/equipment/humanoid/*.png',
    'assets/minecraft/textures/entity/equipment/humanoid_leggings/*.png',
    'assets/minecraft/textures/trims/entity/humanoid/*.png',
    'assets/minecraft/textures/trims/entity/humanoid_leggings/*.png',
    'assets/minecraft/textures/trims/color_palettes/*.png',
    '-d', root,
  ], { stdio: 'ignore' })
  writeFileSync(stamp, `${hash}\n`)
  return join(root, 'assets', 'minecraft')
}
