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
