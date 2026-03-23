import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    root: 'packages/sitego',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'json', 'html'],
    },
  },
  lint: {
    ignorePatterns: ['dist/**', 'fixtures/**'],
  },
  fmt: {
    ignorePatterns: ['**/node_modules/**', '**/dist/**'],
    printWidth: 100,
    singleQuote: true,
    semi: false,
    experimentalSortImports: {},
  },
  staged: {
    '*.{js,ts,tsx}': 'vp check --fix',
  },
})
