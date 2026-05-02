export function trimLeadingNewlines(s: string) {
  return s.replace(/^\n*/, '')
}

export function trimTrailingNewlines(s: string) {
  return s.replace(/\n*$/, '')
}

export function trimNewlines(s: string) {
  return trimTrailingNewlines(trimLeadingNewlines(s))
}

export function decodeEntities(s: string) {
  const NAMED_ENTITIES: { readonly [k: string]: string } = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    copy: '©',
    reg: '®',
    mdash: '—',
    ndash: '–',
    laquo: '«',
    raquo: '»',
    hellip: '…',
    trade: '™',
  }
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    return NAMED_ENTITIES[entity] ?? match
  })
}

export function escapeMarkdown(s: string) {
  const MARKDOWN_ESCAPES = [
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
  return MARKDOWN_ESCAPES.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    s,
  )
}

export function cleanAttribute(attr: string | null) {
  return attr ? attr.replace(/(\n+\s*)+/g, '\n') : ''
}
