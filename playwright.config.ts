import { defineConfig } from '@playwright/test'

/** E2E гоняем по собранному сайту — так же, как он поедет на GitHub Pages. */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/recipebook-plus-plus/',
    trace: 'off',
  },
  // Размер экрана iPhone 17 Pro в точках: слой управления рассчитан на него.
  projects: [
    {
      name: 'iphone',
      use: {
        browserName: 'chromium',
        // В headless нет настоящего GPU, а 3D-схемам нужен WebGL:
        // без программного растеризатора холст остаётся пустым.
        launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
        // Целевой пользователь русскоязычный — интерфейс должен подниматься на русском.
        locale: 'ru-RU',
        viewport: { width: 402, height: 874 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/recipebook-plus-plus/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
