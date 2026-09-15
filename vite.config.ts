import { copyFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages не умеет переписывать пути под одностраничное приложение:
 * прямая ссылка на /26.2/item/diamond вернула бы 404. Кладём копию index.html
 * под именем 404.html — Pages отдаёт её, и роутер разбирает адрес сам.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const dist = resolve('dist')
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
    },
  }
}

// Для project-сайта на GitHub Pages путь равен имени репозитория.
// Переопределяется переменной окружения BASE_PATH в CI.
const base = process.env.BASE_PATH ?? '/recipebook-plus-plus/'

/**
 * Манифест и теги установки зависят от базового пути, а он задаётся
 * переменной окружения. Генерируем их сборкой, чтобы путь не разъезжался
 * между манифестом, иконками и сервис-воркером.
 */
function pwa(): Plugin {
  const manifest = {
    name: 'RecipeBook++',
    short_name: 'RecipeBook',
    description: 'Справочник крафтов, добычи и механик Minecraft',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#120d08',
    theme_color: '#3e3e44',
    icons: [
      { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      {
        src: `${base}icons/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: `${base}icons/icon-1024.png`, sizes: '1024x1024', type: 'image/png' },
    ],
  }

  return {
    name: 'pwa-assets',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
        // Без apple-touch-icon iOS рисует на экране «Домой» скриншот страницы.
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${base}icons/apple-touch-icon.png` }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', href: `${base}icons/icon-192.png` }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'RecipeBook++' }, injectTo: 'head' },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
          injectTo: 'head',
        },
      ]
    },
    generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(manifest, null, 2),
      })

      // Имена бандлов содержат хеш, поэтому список оболочки собирается здесь:
      // без него офлайн открывал бы пустую страницу.
      const assets = Object.keys(bundle)
        .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
        .map((name) => `${base}${name}`)
      const precache = [
        base,
        `${base}index.html`,
        `${base}manifest.webmanifest`,
        `${base}icons/icon-192.png`,
        ...assets,
      ]

      const template = readFileSync(resolve('tools/sw-template.js'), 'utf8')
      const buildVersion = createHash('sha256')
        .update(template)
        .update(JSON.stringify(manifest))
        .update(JSON.stringify(precache))
        .digest('hex')
        .slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
          .replace('__BUILD_VERSION__', buildVersion),
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), spaFallback(), pwa()],
  build: {
    target: 'es2022',
    // Бюджет из плана: initial JS < 150 KB gzip
    chunkSizeWarningLimit: 500,
  },
})
