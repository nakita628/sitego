import { readConfig } from '../config/index.ts'
import { htmlToMarkdown } from '../core/converter.ts'
import { fetchResult } from '../helper/index.ts'

const HELP_TEXT = `Usage: sitego [command] [options]

Commands:
  docs <url|key>   Fetch llms.txt (URL or config key)
  search <url>     Fetch URL and convert to Markdown

Options:
  --full           Use llm-full URL (with docs key)
  -h, --help       Display help`

/**
 * Parses CLI arguments into a typed command object.
 *
 * @remarks
 * Supported commands:
 * - `search <url>` — Fetch URL and convert HTML to Markdown
 * - `docs <url>` — Fetch llms.txt by URL (pass-through, no conversion)
 * - `docs <key>` — Fetch llms.txt by config key
 * - `docs <key> --full` — Fetch llms-full.txt by config key
 * - `-h` / `--help` — Show help
 *
 * Non-URL strings passed to `docs` are treated as config keys.
 *
 * @param args - CLI arguments (typically `process.argv.slice(2)`)
 * @returns A discriminated union of `{ ok: true, value }` or `{ ok: false, error }`
 */
export function parseCli(args: readonly string[]):
  | { readonly ok: true; readonly value: { readonly kind: 'search'; readonly url: string } }
  | { readonly ok: true; readonly value: { readonly kind: 'docs'; readonly url: string } }
  | {
      readonly ok: true
      readonly value: { readonly kind: 'docs-key'; readonly key: string; readonly full: boolean }
    }
  | { readonly ok: true; readonly value: { readonly kind: 'help' } }
  | { readonly ok: false; readonly error: string } {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { ok: true, value: { kind: 'help' } }
  }

  const command = args[0]

  if (command === 'search' && args.length >= 2) {
    const url = args[1]
    return url
      ? { ok: true, value: { kind: 'search', url } }
      : { ok: false, error: 'search command requires a URL argument.' }
  }

  if (command === 'docs' && args.length >= 2) {
    const target = args[1]
    if (!target) {
      return { ok: false, error: 'docs command requires a URL or key argument.' }
    }
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return { ok: true, value: { kind: 'docs', url: target } }
    }
    const full = args.includes('--full')
    return { ok: true, value: { kind: 'docs-key', key: target, full } }
  }

  return { ok: false, error: `Unknown command: ${command}. Run with --help for usage.` }
}

/**
 * Main CLI entry point. Parses arguments and dispatches to the appropriate command.
 *
 * @remarks
 * Command dispatch:
 * - `help` — Returns help text
 * - `search` — Fetches URL, converts HTML to Markdown
 * - `docs` (URL) — Fetches llms.txt directly
 * - `docs` (key) — Loads config, resolves URL from `llms` or `llm-full`, fetches
 *
 * @returns Result with output string on success, or error message on failure
 */
export async function sitego(): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const args = process.argv.slice(2)
  const parseResult = parseCli(args)

  if (!parseResult.ok) return parseResult

  const command = parseResult.value

  if (command.kind === 'help') {
    return { ok: true, value: HELP_TEXT }
  }

  if (command.kind === 'search') {
    const result = await fetchResult(command.url)
    if (!result.ok) return result
    return { ok: true, value: htmlToMarkdown(result.value) }
  }

  if (command.kind === 'docs') {
    return fetchResult(command.url)
  }

  if (command.kind === 'docs-key') {
    const configResult = await readConfig()
    if (!configResult.ok) return configResult
    const source = command.full ? configResult.value['llm-full'] : configResult.value.llms
    const url = source[command.key]
    if (!url) {
      const available = Object.keys(source)
      return {
        ok: false,
        error:
          available.length > 0
            ? `Key "${command.key}" not found. Available: ${available.join(', ')}`
            : `Key "${command.key}" not found. No keys configured in ${command.full ? 'llm-full' : 'llms'}.`,
      }
    }
    return fetchResult(url)
  }

  return { ok: false, error: 'Invalid command' }
}
