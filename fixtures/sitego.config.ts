import { defineConfig } from 'sitego'

export default defineConfig({
  search: {
    hono: 'https://hono.dev/',
  },
  llms: {
    hono: 'https://hono.dev/llms.txt',
    vite: 'https://vite.dev/llms.txt',
  },
  'llm-full': {
    hono: 'https://hono.dev/llms-full.txt',
    vite: 'https://vite.dev/llms-full.txt',
  },
})
