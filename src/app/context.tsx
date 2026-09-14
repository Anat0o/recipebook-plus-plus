/** Общий контекст приложения: данные версии, язык, строки интерфейса. */
import { createContext, useContext } from 'react'
import type { ItemEntry, VersionMeta } from '../lib/schema.ts'
import type { SpriteSheet } from '../lib/data.ts'
import type { Lang, Strings } from '../i18n/index.ts'

export interface AppState {
  version: string
  versionLabel: string
  dataDrivenTrades: boolean
  shards: number
  items: ItemEntry[]
  byId: Map<string, ItemEntry>
  sprites: SpriteSheet
  spriteUrl: string
  /** Названия существ для строк «выпадает с …». */
  entityNames: Record<string, Record<string, string>>
  lang: Lang
  t: Strings
  openItem: (id: string) => void
  /** Показывать ли предметы, которые выдаются только командой. */
  showCommandOnly: boolean
  /** Метаданные версии — нужны для списка файлов оффлайн-копии. */
  meta: VersionMeta
}

const AppContext = createContext<AppState | null>(null)

export const AppProvider = AppContext.Provider

export function useApp(): AppState {
  const state = useContext(AppContext)
  if (!state) throw new Error('useApp вызван вне AppProvider')
  return state
}
