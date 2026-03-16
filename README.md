# sitego

Fetch HTML and convert to Markdown, or fetch [llms.txt](https://llmstxt.org/) as-is.

## Install

```bash
npm install -D sitego
```

## Usage

```bash
# Convert HTML to Markdown
sitego search https://example.com

# Fetch llms.txt by URL
sitego docs https://hono.dev/llms.txt

# Fetch llms.txt by config key
sitego docs hono

# Fetch llms-full.txt by config key
sitego docs hono --full
```

## Config

```ts
// sitego.config.ts
import { defineConfig } from 'sitego/config'

export default defineConfig({
  llms: {
    hono: 'https://hono.dev/llms.txt',
  },
  'llm-full': {
    hono: 'https://hono.dev/llms-full.txt',
  },
})
```

## License

MIT
