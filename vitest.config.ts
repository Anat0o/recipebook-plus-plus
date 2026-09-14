import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Сквозные проверки гоняет Playwright — сюда они не попадают.
    include: ['tools/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
