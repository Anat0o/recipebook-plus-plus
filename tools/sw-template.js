/*
 * Сервис-воркер: оболочка и данные из кэша.
 *
 * Базовый путь не зашит — берём его из области действия воркера, поэтому он
 * одинаково работает и на GitHub Pages в подкаталоге, и в корне домена.
 * Список файлов оболочки подставляет сборка: имена бандлов содержат хеш,
 * а без них офлайн открывал бы пустую страницу.
 */
const VERSION = '__BUILD_VERSION__'
const SHELL = `recipebook-shell-${VERSION}`
const RUNTIME = `recipebook-runtime-${VERSION}`
const SCOPE = new URL(self.registration.scope)
/** Заполняется сборкой: оболочка приложения вместе с бандлами. */
const PRECACHE = __PRECACHE__

/*
 * Модульные скрипты Vite запрашиваются с crossorigin, то есть в режиме CORS
 * и с заголовком Origin, а в кэш они попали обычным запросом без него.
 * Из-за Vary такие записи не совпадают — поэтому сравниваем только по адресу.
 */
const MATCH = { ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Кэш данных версии живёт своей жизнью: его наполняет кнопка
            // в настройках, и чистить его при обновлении оболочки нельзя.
            .filter((key) => key.startsWith('recipebook-') && !key.startsWith('recipebook-data-'))
            .filter((key) => key !== SHELL && key !== RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return

  // Переходы по страницам: одностраничное приложение всегда отдаёт оболочку.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL)
        return (
          (await cache.match(`${SCOPE.pathname}index.html`, MATCH)) ??
          (await cache.match(SCOPE.pathname, MATCH)) ??
          Response.error()
        )
      }),
    )
    return
  }

  // The shell and version list are small mutable resources. Prefer the
  // network so an installed app notices releases, while retaining fallback.
  const mutable = url.pathname === SCOPE.pathname || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/data/versions.json')
  if (mutable) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) caches.open(RUNTIME).then((cache) => cache.put(request, response.clone()))
        return response
      }).catch(async () => (await caches.match(request, MATCH)) ?? Response.error()),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, MATCH)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(RUNTIME)
          cache.put(request, response.clone())
        }
        return response
      } catch (error) {
        return cached ?? Response.error()
      }
    })(),
  )
})
