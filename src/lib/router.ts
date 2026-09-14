/**
 * Минимальный роутер поверх History API.
 * Адрес — источник истины: версия и предмет живут в URL, ссылки шарятся.
 */
import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL
const STATE_KEY = 'recipebookDepth'

export type Route =
  | { name: 'home'; version?: string }
  | { name: 'item'; version: string; id: string }
  | { name: 'station'; version: string; id: string }

export function parseRoute(pathname: string): Route {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')
  const parts = rest.split('/').filter(Boolean).map(decodeURIComponent)

  if (parts.length === 0) return { name: 'home' }
  const [version, section, id] = parts
  if (section === 'item' && id) return { name: 'item', version: version!, id }
  if (section === 'station' && id) return { name: 'station', version: version!, id }
  return { name: 'home', version }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return route.version ? `${BASE}${route.version}` : BASE
    case 'item':
      return `${BASE}${route.version}/item/${route.id}`
    case 'station':
      return `${BASE}${route.version}/station/${route.id}`
  }
}

export function navigate(route: Route, replace = false): void {
  const url = href(route)
  const currentDepth = typeof history.state?.[STATE_KEY] === 'number' ? history.state[STATE_KEY] : 0
  const state = { ...(history.state ?? {}), [STATE_KEY]: replace ? currentDepth : currentDepth + 1 }
  if (replace) history.replaceState(state, '', url)
  else history.pushState(state, '', url)
  dispatchEvent(new PopStateEvent('popstate'))
}

/** Возвращается по истории приложения, а у прямой ссылки открывает безопасный корень. */
export function backOrNavigate(fallback: Route): void {
  const depth = typeof history.state?.[STATE_KEY] === 'number' ? history.state[STATE_KEY] : 0
  if (depth > 0) history.back()
  else navigate(fallback, true)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.pathname))
  useEffect(() => {
    if (typeof history.state?.[STATE_KEY] !== 'number') {
      history.replaceState({ ...(history.state ?? {}), [STATE_KEY]: 0 }, '', location.href)
    }
    const update = (): void => setRoute(parseRoute(location.pathname))
    addEventListener('popstate', update)
    return () => removeEventListener('popstate', update)
  }, [])
  return route
}
