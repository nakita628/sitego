# sitego

Fetch HTML and convert to Markdown, or fetch [llms.txt](https://llmstxt.org/) as-is.

## Install

```bash
npm install -D sitego
```

## Usage

```bash
# Convert HTML to Markdown
npx sitego search https://example.com

# Fetch llms.txt by URL
npx sitego docs https://hono.dev/llms.txt

# Fetch llms.txt by config key
npx sitego docs hono

# Fetch llms-full.txt by config key
npx sitego docs hono --full
```

## Config

```ts
// sitego.config.ts
import { defineConfig } from 'sitego'

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

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/sitego?tab=MIT-1-ov-file) for more information.
