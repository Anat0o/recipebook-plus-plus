/**
 * Смотрит, не появился ли в mcmeta релиз новее того, что перечислен в config.ts.
 * При находке дописывает версию в набор и сообщает об этом workflow через
 * выходные параметры — дальше pull request открывает GitHub Actions.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { VERSIONS } from './config.ts'

const VERSIONS_URL = 'https://raw.githubusercontent.com/misode/mcmeta/summary/versions/data.json'

interface McmetaVersion {
  id: string
  name: string
  type: 'release' | 'snapshot'
}

const response = await fetch(VERSIONS_URL)
if (!response.ok) throw new Error(`mcmeta вернул ${response.status}`)
const all = (await response.json()) as McmetaVersion[]

const requested = process.env.REQUESTED_VERSION?.trim()
const target = requested
  ? all.find((entry) => entry.id === requested)
  : all.find((entry) => entry.type === 'release')

if (!target) {
  fail(requested ? `версия ${requested} в mcmeta не найдена` : 'в mcmeta нет ни одного релиза')
}

const known = new Set(VERSIONS.map((version) => version.id))
if (known.has(target.id)) {
  console.log(`Актуальная версия ${target.id} уже в наборе.`)
  output('changed', 'false')
  process.exit(0)
}

console.log(`Новая версия: ${target.id}. Дописываю в tools/config.ts.`)

const configPath = 'tools/config.ts'
const config = readFileSync(configPath, 'utf8')
const entry = `  { id: '${target.id}', label: '${target.name}', latest: true, dataDrivenTrades: true },\n`
const updated = config
  .replace(/latest: true, /g, '')
  .replace('export const VERSIONS: VersionConfig[] = [\n', `export const VERSIONS: VersionConfig[] = [\n${entry}`)

writeFileSync(configPath, updated)
output('changed', 'true')
output('version', target.id)

function output(key: string, value: string): void {
  console.log(`${key}=${value}`)
  const file = process.env.GITHUB_OUTPUT
  if (file) appendFileSync(file, `${key}=${value}\n`)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
