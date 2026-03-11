# fixtures

Test fixtures for sitego config.

## sitego.config.ts

Sample config file used in tests. Imports `defineConfig` from `sitego` workspace package.

```ts
import { defineConfig } from 'sitego'

export default defineConfig({
  llms: [{ hono: 'https://hono.dev/llms.txt', vite: 'https://vite.dev/llms.txt' }],
  'llm-full': [{ hono: 'https://hono.dev/llm-full.txt', vite: 'https://vite.dev/llm-full.txt' }],
})
```
