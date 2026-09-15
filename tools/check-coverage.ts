/**
 * Проверка полноты данных. Падает, если сборка начала терять информацию:
 * не разобрался рецепт, в таблицах добычи появилась неизвестная конструкция,
 * у предмета пропала иконка или список предметов без источников вырос.
 */
import { existsSync, readFileSync } from 'node:fs'

/** Предметы, которых честно нет способа получить в выживании. */
const CREATIVE_ONLY = new Set([
  'barrier', 'light', 'structure_block', 'structure_void', 'jigsaw', 'command_block',
  'chain_command_block', 'repeating_command_block', 'command_block_minecart', 'debug_stick',
  'knowledge_book', 'bedrock', 'end_portal_frame', 'spawner', 'trial_spawner', 'vault',
  'petrified_oak_slab', 'farmland', 'dirt_path', 'water', 'lava', 'end_gateway', 'end_portal',
  'nether_portal', 'moving_piston', 'piston_head', 'bubble_column', 'reinforced_deepslate',
  'budding_amethyst', 'infested_stone', 'player_head', 'chorus_plant',
  'test_block', 'test_instance_block',
])

const REPORT = 'public/data/coverage.json'
if (!existsSync(REPORT)) {
  console.error(`Нет ${REPORT}. Сначала выполните: npm run build:data`)
  process.exit(1)
}

interface Report {
  version: string
  items: number
  icons: { rendered: number; approx: number; missing: number }
  recipes: {
    read: number
    published: number
    intentionallySkipped: number
    unsupported: Record<string, number>
  }
  loot: { tables: number; sources: number; unknown: string[] }
  trades: number
  dataDrivenTrades?: boolean
  itemsWithoutSources: string[]
}

/** В версиях до 26.x сделки жителей зашиты в код — эти предметы иначе не достать. */
const TRADE_ONLY = new Set(['enchanted_book', 'globe_banner_pattern'])

const reports: Report[] = JSON.parse(readFileSync(REPORT, 'utf8'))
const problems: string[] = []
const versionList: { default: string; versions: { id: string; revision?: string }[] } = JSON.parse(
  readFileSync('public/data/versions.json', 'utf8'),
)

const requiredVersionFiles = [
  'meta.json', 'items.json', 'sprites.json', 'guides.json', 'villagers.json',
  'stations.json', 'blocks.json', 'blocks.png', 'armor-trims.json', 'armor-sets.png',
  'offline.json',
]
for (const version of versionList.versions) {
  for (const file of requiredVersionFiles) {
    if (!existsSync(`public/data/${version.id}/${file}`)) problems.push(`[${version.id}] отсутствует обязательный файл ${file}`)
  }
  if (typeof version.revision !== 'string' || version.revision.length === 0) {
    problems.push(`[${version.id}] в versions.json отсутствует ревизия офлайн-пакета`)
  }
}
if (!versionList.versions.some((version) => version.id === versionList.default)) {
  problems.push(`версия по умолчанию ${versionList.default} не опубликована`)
}
if (new Set(reports.map((report) => report.version)).size !== versionList.versions.length ||
    versionList.versions.some((version) => !reports.some((report) => report.version === version.id))) {
  problems.push('coverage.json не совпадает со списком опубликованных версий')
}

for (const report of reports) {
  const label = `[${report.version}]`

  const skippedByType = Object.values(report.recipes.unsupported).reduce((sum, count) => sum + count, 0)
  if (report.recipes.intentionallySkipped !== skippedByType) {
    problems.push(`${label} счётчик осознанно пропущенных рецептов не совпадает с разбивкой по типам`)
  }

  // Allowlist намеренно пуст: появление нового типа рецепта должно остановить сборку,
  // пока для него не будет добавлена полноценная модель или явное обоснование пропуска.
  if (report.recipes.intentionallySkipped > 0 || report.recipes.published + report.recipes.intentionallySkipped !== report.recipes.read) {
    problems.push(
      `${label} опубликовано ${report.recipes.published}, осознанно пропущено ${report.recipes.intentionallySkipped} ` +
        `из ${report.recipes.read}: ` +
        JSON.stringify(report.recipes.unsupported),
    )
  }

  if (report.loot.unknown.length > 0) {
    problems.push(`${label} неизвестные конструкции таблиц добычи: ${report.loot.unknown.join(', ')}`)
  }

  if (report.icons.missing > 0) {
    problems.push(`${label} предметов без иконки: ${report.icons.missing}`)
  }

  // Предметы без источников допустимы, но каждый должен быть осознанным.
  const unexpected = report.itemsWithoutSources.filter(
    (id) =>
      !CREATIVE_ONLY.has(id) &&
      !id.endsWith('_spawn_egg') &&
      !id.startsWith('infested_') &&
      !(report.dataDrivenTrades === false && TRADE_ONLY.has(id)),
  )
  if (unexpected.length > 0) {
    problems.push(
      `${label} предметов без источников сверх ожидаемых: ${unexpected.length}\n    ${unexpected.slice(0, 25).join(', ')}` +
        (unexpected.length > 25 ? ' …' : ''),
    )
  }

  console.log(
    `${label} предметов ${report.items}, рецептов прочитано ${report.recipes.read}, ` +
      `опубликовано ${report.recipes.published}, пропущено ${report.recipes.intentionallySkipped}, ` +
      `источников из лута ${report.loot.sources}, сделок ${report.trades}, ` +
      `иконок ${report.icons.rendered} (приблизительных ${report.icons.approx})`,
  )
}

if (problems.length > 0) {
  console.error('\nПроблемы покрытия:')
  for (const problem of problems) console.error(`  • ${problem}`)
  process.exit(1)
}

console.log('\nПокрытие в порядке.')
