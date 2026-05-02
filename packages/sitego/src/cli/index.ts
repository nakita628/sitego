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

export function parseCli(args: readonly string[]) {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { ok: true, value: { kind: 'help' } } as const
  }
  const command = args[0]
  if (command === 'search' && args.length >= 2) {
    const url = args[1]
    if (!url) {
      return { ok: false, error: 'search command requires a URL argument.' } as const
    }
    return { ok: true, value: { kind: 'search', url } } as const
  }
  if (command === 'docs' && args.length >= 2) {
    const target = args[1]
    if (!target) {
      return { ok: false, error: 'docs command requires a URL or key argument.' } as const
    }
    if (target.startsWith('http://') || target.startsWith('https://')) {
      return { ok: true, value: { kind: 'docs', url: target } } as const
    }
    const full = args.includes('--full')
    return { ok: true, value: { kind: 'docs-key', key: target, full } } as const
  }
  return { ok: false, error: `Unknown command: ${command}. Run with --help for usage.` } as const
}

export async function sitego() {
  const args = process.argv.slice(2)
  const parseResult = parseCli(args)
  if (!parseResult.ok) return parseResult
  const command = parseResult.value
  if (command.kind === 'help') {
    return { ok: true, value: HELP_TEXT } as const
  }
  if (command.kind === 'search') {
    const result = await fetchResult(command.url)
    if (!result.ok) return result
    return { ok: true, value: htmlToMarkdown(result.value) } as const
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
      } as const
    }
    return fetchResult(url)
  }
  return { ok: false, error: 'Invalid command' } as const
}
