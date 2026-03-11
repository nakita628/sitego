import { describe, it, expect } from 'vitest'

import {
  parseCli,
  trimLeadingNewlines,
  trimTrailingNewlines,
  trimNewlines,
  decodeEntities,
  escapeMarkdown,
  cleanAttribute,
} from './index.ts'

describe('parseCli', () => {
  describe('help', () => {
    it('returns help for no args', () => {
      expect(parseCli([])).toStrictEqual({ ok: true, value: { kind: 'help' } })
    })

    it('returns help for -h flag', () => {
      expect(parseCli(['-h'])).toStrictEqual({ ok: true, value: { kind: 'help' } })
    })

    it('returns help for --help flag', () => {
      expect(parseCli(['--help'])).toStrictEqual({ ok: true, value: { kind: 'help' } })
    })

    it('returns help when --help appears with other args', () => {
      expect(parseCli(['docs', '--help'])).toStrictEqual({ ok: true, value: { kind: 'help' } })
    })
  })

  describe('search command', () => {
    it('parses search with https URL', () => {
      expect(parseCli(['search', 'https://example.com'])).toStrictEqual({
        ok: true,
        value: { kind: 'search', url: 'https://example.com' },
      })
    })

    it('parses search with http URL', () => {
      expect(parseCli(['search', 'http://example.com'])).toStrictEqual({
        ok: true,
        value: { kind: 'search', url: 'http://example.com' },
      })
    })

    it('returns error for search without URL', () => {
      const result = parseCli(['search'])
      expect(result.ok).toBe(false)
    })
  })

  describe('docs command with URL', () => {
    it('parses docs with https URL', () => {
      expect(parseCli(['docs', 'https://hono.dev/llms.txt'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs', url: 'https://hono.dev/llms.txt' },
      })
    })

    it('parses docs with http URL', () => {
      expect(parseCli(['docs', 'http://example.com/llms.txt'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs', url: 'http://example.com/llms.txt' },
      })
    })

    it('returns error for docs without argument', () => {
      const result = parseCli(['docs'])
      expect(result.ok).toBe(false)
    })
  })

  describe('docs command with config key', () => {
    it('parses docs with key (no --full)', () => {
      expect(parseCli(['docs', 'hono'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs-key', key: 'hono', full: false },
      })
    })

    it('parses docs with key and --full flag', () => {
      expect(parseCli(['docs', 'hono', '--full'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs-key', key: 'hono', full: true },
      })
    })

    it('parses docs with key containing hyphens', () => {
      expect(parseCli(['docs', 'my-project'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs-key', key: 'my-project', full: false },
      })
    })

    it('treats non-URL string as config key', () => {
      expect(parseCli(['docs', 'vite'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs-key', key: 'vite', full: false },
      })
    })

    it('--full flag position does not matter', () => {
      expect(parseCli(['docs', 'hono', '--full'])).toStrictEqual({
        ok: true,
        value: { kind: 'docs-key', key: 'hono', full: true },
      })
    })
  })

  describe('unknown command', () => {
    it('returns error with command name', () => {
      const result = parseCli(['unknown'])
      expect(result).toStrictEqual({
        ok: false,
        error: 'Unknown command: unknown. Run with --help for usage.',
      })
    })

    it('returns error for single non-command word', () => {
      expect(parseCli(['fetch'])).toStrictEqual({
        ok: false,
        error: 'Unknown command: fetch. Run with --help for usage.',
      })
    })
  })
})

describe('trimLeadingNewlines', () => {
  it('removes leading newlines', () => {
    expect(trimLeadingNewlines('\n\nhello')).toBe('hello')
  })

  it('does not remove trailing newlines', () => {
    expect(trimLeadingNewlines('hello\n\n')).toBe('hello\n\n')
  })

  it('returns empty string for only newlines', () => {
    expect(trimLeadingNewlines('\n\n\n')).toBe('')
  })

  it('returns string unchanged when no leading newlines', () => {
    expect(trimLeadingNewlines('hello')).toBe('hello')
  })

  it('returns empty string for empty input', () => {
    expect(trimLeadingNewlines('')).toBe('')
  })
})

describe('trimTrailingNewlines', () => {
  it('removes trailing newlines', () => {
    expect(trimTrailingNewlines('hello\n\n')).toBe('hello')
  })

  it('does not remove leading newlines', () => {
    expect(trimTrailingNewlines('\n\nhello')).toBe('\n\nhello')
  })

  it('returns empty string for only newlines', () => {
    expect(trimTrailingNewlines('\n\n\n')).toBe('')
  })

  it('returns string unchanged when no trailing newlines', () => {
    expect(trimTrailingNewlines('hello')).toBe('hello')
  })
})

describe('trimNewlines', () => {
  it('removes both leading and trailing newlines', () => {
    expect(trimNewlines('\n\nhello\n\n')).toBe('hello')
  })

  it('preserves inner newlines', () => {
    expect(trimNewlines('\nhello\nworld\n')).toBe('hello\nworld')
  })
})

describe('decodeEntities', () => {
  describe('named entities', () => {
    it('decodes &amp;', () => {
      expect(decodeEntities('&amp;')).toBe('&')
    })

    it('decodes &lt; and &gt;', () => {
      expect(decodeEntities('&lt;div&gt;')).toBe('<div>')
    })

    it('decodes &quot; and &apos;', () => {
      expect(decodeEntities('&quot;hello&apos;')).toBe('"hello\'')
    })

    it('decodes &nbsp;', () => {
      expect(decodeEntities('hello&nbsp;world')).toBe('hello\u00A0world')
    })

    it('decodes &copy; &reg; &trade;', () => {
      expect(decodeEntities('&copy; &reg; &trade;')).toBe('\u00A9 \u00AE \u2122')
    })

    it('decodes &mdash; and &ndash;', () => {
      expect(decodeEntities('&mdash; &ndash;')).toBe('\u2014 \u2013')
    })

    it('decodes &laquo; and &raquo;', () => {
      expect(decodeEntities('&laquo;text&raquo;')).toBe('\u00ABtext\u00BB')
    })

    it('decodes &hellip;', () => {
      expect(decodeEntities('wait&hellip;')).toBe('wait\u2026')
    })

    it('returns unknown named entities unchanged', () => {
      expect(decodeEntities('&unknown;')).toBe('&unknown;')
    })
  })

  describe('numeric entities', () => {
    it('decodes decimal numeric entity', () => {
      expect(decodeEntities('&#65;')).toBe('A')
    })

    it('decodes hex numeric entity (lowercase x)', () => {
      expect(decodeEntities('&#x41;')).toBe('A')
    })

    it('does not decode hex numeric entity with uppercase X (unsupported)', () => {
      expect(decodeEntities('&#X41;')).toBe('&#X41;')
    })

    it('decodes multi-byte unicode', () => {
      expect(decodeEntities('&#x1F600;')).toBe('\u{1F600}')
    })
  })

  describe('mixed content', () => {
    it('decodes multiple entities in one string', () => {
      expect(decodeEntities('&lt;a href=&quot;url&quot;&gt;')).toBe('<a href="url">')
    })

    it('preserves text without entities', () => {
      expect(decodeEntities('hello world')).toBe('hello world')
    })

    it('preserves ampersand without semicolon', () => {
      expect(decodeEntities('a & b')).toBe('a & b')
    })
  })
})

describe('escapeMarkdown', () => {
  it('escapes backslash', () => {
    expect(escapeMarkdown('a\\b')).toBe('a\\\\b')
  })

  it('escapes asterisks', () => {
    expect(escapeMarkdown('a * b')).toBe('a \\* b')
  })

  it('escapes leading hyphen', () => {
    expect(escapeMarkdown('- item')).toBe('\\- item')
  })

  it('escapes leading plus with space', () => {
    expect(escapeMarkdown('+ item')).toBe('\\+ item')
  })

  it('escapes leading equals', () => {
    expect(escapeMarkdown('===')).toBe('\\===')
  })

  it('escapes leading hashes with space', () => {
    expect(escapeMarkdown('# heading')).toBe('\\# heading')
    expect(escapeMarkdown('## heading')).toBe('\\## heading')
  })

  it('escapes backticks', () => {
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`')
  })

  it('escapes leading tildes', () => {
    expect(escapeMarkdown('~~~')).toBe('\\~~~')
  })

  it('escapes square brackets', () => {
    expect(escapeMarkdown('[link](url)')).toBe('\\[link\\](url)')
  })

  it('escapes leading greater-than', () => {
    expect(escapeMarkdown('> quote')).toBe('\\> quote')
  })

  it('escapes underscores', () => {
    expect(escapeMarkdown('_italic_')).toBe('\\_italic\\_')
  })

  it('escapes ordered list markers', () => {
    expect(escapeMarkdown('1. item')).toBe('1\\. item')
  })

  it('does not escape plus without trailing space', () => {
    expect(escapeMarkdown('+noSpace')).toBe('+noSpace')
  })

  it('does not escape hash without trailing space', () => {
    expect(escapeMarkdown('#noSpace')).toBe('#noSpace')
  })
})

describe('cleanAttribute', () => {
  it('returns empty string for null', () => {
    expect(cleanAttribute(null)).toBe('')
  })

  it('returns string unchanged when no newlines', () => {
    expect(cleanAttribute('hello world')).toBe('hello world')
  })

  it('collapses newlines with whitespace', () => {
    expect(cleanAttribute('hello\n  world')).toBe('hello\nworld')
  })

  it('collapses multiple newlines', () => {
    expect(cleanAttribute('hello\n\n\n  world')).toBe('hello\nworld')
  })

  it('returns empty string for empty string', () => {
    expect(cleanAttribute('')).toBe('')
  })
})
