/**
 * Реестр предметов версии с локализованными названиями.
 * Названия берём из официальных языковых файлов игры — переводить вручную нечего.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AssetSource } from './mc/models.ts'
import { sourceDir } from './fetch-mcmeta.ts'
import { LOCALES } from './config.ts'

export interface ItemEntry {
  id: string
  /** Локализованные названия: код языка → строка. */
  names: Record<string, string>
  /** У предмета есть одноимённый блок — влияет на разделы «выпадает из блока». */
  isBlock: boolean
  /**
   * Ни одного способа получить в игре: только командой. Проставляется в
   * build-all.ts, когда уже известны все источники версии.
   */
  commandOnly?: boolean
}

/** Названия существ — нужны для строк «выпадает с визер-скелета». */
export type NameMap = Record<string, Record<string, string>>

export function buildItems(version: string): {
  items: ItemEntry[]
  missingNames: string[]
  entityNames: NameMap
} {
  const assets = `${sourceDir(version, 'assets-json')}/assets/minecraft`
  const src = new AssetSource(assets)

  const lang: Record<string, Record<string, string>> = {}
  for (const [mcCode, siteCode] of Object.entries(LOCALES)) {
    lang[siteCode] = JSON.parse(readFileSync(join(assets, 'lang', `${mcCode}.json`), 'utf8'))
  }

  const items: ItemEntry[] = []
  const missingNames: string[] = []

  for (const id of src.listItems()) {
    if (id === 'air') continue
    const names: Record<string, string> = {}
    let isBlock = false
    for (const [siteCode, dict] of Object.entries(lang)) {
      const blockName = dict[`block.minecraft.${id}`]
      const itemName = dict[`item.minecraft.${id}`]
      if (blockName) isBlock = true
      const name = itemName ?? blockName
      if (name) names[siteCode] = name
    }
    if (Object.keys(names).length === 0) missingNames.push(id)
    items.push({ id, names, isBlock })
  }

  const entityNames: NameMap = {}
  for (const [siteCode, dict] of Object.entries(lang)) {
    for (const [key, value] of Object.entries(dict)) {
      if (!key.startsWith('entity.minecraft.')) continue
      const id = key.slice('entity.minecraft.'.length)
      // Подтипы вроде entity.minecraft.villager.farmer нам не нужны.
      if (id.includes('.')) continue
      ;(entityNames[id] ??= {})[siteCode] = value
    }
  }

  return { items, missingNames, entityNames }
}
