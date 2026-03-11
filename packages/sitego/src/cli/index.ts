import { readConfig } from '../config/index.ts'
import { htmlToMarkdown } from '../core/converter.ts'
import { fetchResult } from '../helper/index.ts'
import { parseCli } from '../utils/index.ts'

const HELP_TEXT = `Usage: sitego [command] [options]

Commands:
  docs <url|key>   Fetch llms.txt (URL or config key)
  search <url>     Fetch URL and convert to Markdown

Options:
  --full           Use llm-full URL (with docs key)
  -h, --help       Display help`

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
