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

# Convert HTML to Markdown by config key
npx sitego search example

# Fetch llms.txt by URL
npx sitego docs https://hono.dev/llms.txt

# Fetch llms.txt by config key
npx sitego docs hono

# Fetch llms-full.txt by config key
npx sitego docs hono --full
```

## Config (optional)

Register keys so you can pass them instead of URLs.

```ts
// sitego.config.ts
import { defineConfig } from 'sitego/config'

export default defineConfig({
  search: {
    example: 'https://example.com',
  },
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
