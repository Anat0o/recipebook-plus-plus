/**
 * Навигационная панель. В ней только переходы между разделами —
 * никаких действий, и ни один пункт никогда не прячется.
 */
export type TabId = 'catalog' | 'farms' | 'redstone' | 'villagers' | 'settings'

export interface TabDef {
  id: TabId
  label: string
  icon: React.ReactNode
}

export function TabBar({
  tabs,
  active,
  onSelect,
  minimized,
  navLabel,
}: {
  tabs: TabDef[]
  active: TabId
  onSelect: (id: TabId) => void
  minimized: boolean
  navLabel: string
}): React.ReactElement {
  return (
    <nav className={`tab-bar${minimized ? ' is-minimized' : ''}`} aria-label={navLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-bar__item${tab.id === active ? ' is-active' : ''}`}
          aria-current={tab.id === active ? 'page' : undefined}
          onClick={() => onSelect(tab.id)}
        >
          <span className="tab-bar__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="tab-bar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const TAB_ICONS: Record<TabId, React.ReactNode> = {
  catalog: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" {...stroke} />
      <rect x="13.5" y="3" width="7.5" height="7.5" {...stroke} />
      <rect x="3" y="13.5" width="7.5" height="7.5" {...stroke} />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" {...stroke} />
    </svg>
  ),
  // Колос: раздел про фермы.
  farms: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21V8" {...stroke} />
      <path d="M12 8c0-2.4 1.6-4.4 3.6-5.2C15.8 5.2 14.4 7.6 12 8Z" {...stroke} />
      <path d="M12 8C12 5.6 10.4 3.6 8.4 2.8 8.2 5.2 9.6 7.6 12 8Z" {...stroke} />
      <path d="M12 14c0-2.2 1.5-4 3.4-4.7.2 2.2-1.1 4.3-3.4 4.7Z" {...stroke} />
      <path d="M12 14c0-2.2-1.5-4-3.4-4.7-.2 2.2 1.1 4.3 3.4 4.7Z" {...stroke} />
    </svg>
  ),
  // Редстоуновый факел: узнаваемее любой схемы из проводов.
  redstone: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21v-8" {...stroke} />
      <path d="M9.6 13h4.8" {...stroke} />
      <circle cx="12" cy="7.4" r="3.4" fill="currentColor" stroke="none" />
      <path d="M12 3.2v.6M7.6 7.4h.6M15.8 7.4h.6" {...stroke} />
    </svg>
  ),
  villagers: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 4h10l2 4-1 10H6L5 8l2-4Z" {...stroke} />
      <path d="M8 10h2m4 0h2m-6 4h4" {...stroke} />
      <path d="M10 12l2 1 2-1" {...stroke} />
    </svg>
  ),
  // Шестерёнка, а не солнце: раньше иконка читалась как переключатель темы.
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3.1" {...stroke} />
      <path
        d="M19.3 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.3a1.8 1.8 0 1 1-3.6 0V20a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.3-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3H10a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7V10a1.5 1.5 0 0 0 1.4.9h.3a1.8 1.8 0 1 1 0 3.6H20a1.5 1.5 0 0 0-1.4.9Z"
        {...stroke}
      />
    </svg>
  ),
}
