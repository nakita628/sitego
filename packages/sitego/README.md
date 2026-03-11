# sitego

Fetch HTML and convert to Markdown. Zero external dependencies.

## Install

```bash
npm install sitego
```

## CLI

sitego has two commands with different purposes:

| Command  | Input                      | Processing                   | Output   |
| -------- | -------------------------- | ---------------------------- | -------- |
| `search` | Any web page URL           | HTML → Markdown conversion   | Markdown |
| `docs`   | llms.txt URL or config key | No conversion (pass-through) | Raw text |

### `search` - Convert HTML to Markdown

Fetches a web page and converts the HTML to Markdown. Useful for reading any website content as plain text.

```bash
sitego search https://example.com
```

### `docs` - Fetch llms.txt as-is

Fetches `llms.txt` or `llms-full.txt` and outputs the content directly. No conversion is applied since these files are already in Markdown format.

```bash
# Fetch by URL
sitego docs https://hono.dev/llms.txt
```

To avoid typing long URLs every time, register them in a config file and fetch by key:

```bash
# Fetch llms.txt (from `llms` config)
sitego docs hono

# Fetch llms-full.txt (from `llm-full` config)
sitego docs hono --full
```

This requires a `sitego.config.ts` in the current directory. See [Config](#config) below.

## Config

Create `sitego.config.ts` in your project root to register frequently used llms.txt URLs.

```ts
import { defineConfig } from 'sitego/config'

export default defineConfig({
  llms: {
    hono: 'https://hono.dev/llms.txt',
    vite: 'https://vite.dev/llms.txt',
  },
  'llm-full': {
    hono: 'https://hono.dev/llms-full.txt',
    vite: 'https://vite.dev/llms-full.txt',
  },
})
```

| Field      | Used by                       | Description                        |
| ---------- | ----------------------------- | ---------------------------------- |
| `llms`     | `sitego docs <key>`        | Standard llms.txt URLs (summary)   |
| `llm-full` | `sitego docs <key> --full` | Full llms.txt URLs (complete docs) |

> Many projects publish `llms.txt` (summary) and `llms-full.txt` (full docs) following the [llms.txt specification](https://llmstxt.org/). Register both in your config for quick access.

## Options

```
Usage: sitego [command] [options]

Commands:
  docs <url|key>   Fetch llms.txt (URL or config key)
  search <url>     Fetch URL and convert to Markdown

Options:
  --full           Use llm-full URL (with docs key)
  -h, --help       Display help
```

## License

MIT
