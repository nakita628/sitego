/** Removes all leading newlines from a string. Other whitespace is preserved. */
export function trimLeadingNewlines(s: string): string {
  return s.replace(/^\n*/, '')
}

/** Removes all trailing newlines from a string. Other whitespace is preserved. */
export function trimTrailingNewlines(s: string): string {
  return s.replace(/\n*$/, '')
}

/** Removes both leading and trailing newlines. Inner newlines are preserved. */
export function trimNewlines(s: string): string {
  return trimTrailingNewlines(trimLeadingNewlines(s))
}

/**
 * Decodes HTML character entities in a string.
 *
 * @remarks
 * Supports named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`,
 * `&nbsp;`, `&copy;`, `&reg;`, `&mdash;`, `&ndash;`, `&laquo;`, `&raquo;`,
 * `&hellip;`, `&trade;`), decimal numeric entities (`&#65;`), and
 * lowercase hex entities (`&#x41;`). Unrecognized entities are left as-is.
 *
 * @param s - String containing HTML entities
 * @returns String with entities decoded
 */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return (
      {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: '\u00A0',
        copy: '\u00A9',
        reg: '\u00AE',
        mdash: '\u2014',
        ndash: '\u2013',
        laquo: '\u00AB',
        raquo: '\u00BB',
        hellip: '\u2026',
        trade: '\u2122',
      }[entity] ?? match
    )
  })
}

/**
 * Escapes Markdown special characters in plain text.
 *
 * @remarks
 * Escapes: backslash, asterisk, leading hyphen, leading plus, leading equals,
 * leading hashes, backtick, leading tildes, square brackets, leading
 * greater-than, underscore, and ordered list markers.
 *
 * @param s - Plain text string
 * @returns String with Markdown special characters escaped
 */
export function escapeMarkdown(s: string): string {
  return (
    [
      [/\\/g, '\\\\'],
      [/\*/g, '\\*'],
      [/^-/g, '\\-'],
      [/^\+ /g, '\\+ '],
      [/^(=+)/g, '\\$1'],
      [/^(#{1,6}) /g, '\\$1 '],
      [/`/g, '\\`'],
      [/^~~~/g, '\\~~~'],
      [/\[/g, '\\['],
      [/\]/g, '\\]'],
      [/^>/g, '\\>'],
      [/_/g, '\\_'],
      [/^(\d+)\. /g, '$1\\. '],
    ] as const
  ).reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), s)
}

/**
 * Normalizes an HTML attribute value by collapsing newlines with surrounding
 * whitespace into a single newline.
 *
 * @param attr - Attribute value, or `null`
 * @returns Cleaned string, or empty string if `null`
 */
export function cleanAttribute(attr: string | null): string {
  return attr ? attr.replace(/(\n+\s*)+/g, '\n') : ''
}

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
