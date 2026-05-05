import { describe, it, expect } from 'vite-plus/test'

import { parseCli } from './index.ts'

describe('parseCli', () => {
  it('returns help when no args', () => {
    expect(parseCli([])).toStrictEqual({ ok: true, value: { kind: 'help' } })
  })

  it('returns help with -h', () => {
    expect(parseCli(['-h'])).toStrictEqual({ ok: true, value: { kind: 'help' } })
  })

  it('returns help with --help', () => {
    expect(parseCli(['--help'])).toStrictEqual({ ok: true, value: { kind: 'help' } })
  })

  it('parses search with absolute URL', () => {
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

  it('parses search with config key', () => {
    expect(parseCli(['search', 'hono'])).toStrictEqual({
      ok: true,
      value: { kind: 'search-key', key: 'hono' },
    })
  })

  it('parses docs with absolute URL', () => {
    expect(parseCli(['docs', 'https://hono.dev/llms.txt'])).toStrictEqual({
      ok: true,
      value: { kind: 'docs', url: 'https://hono.dev/llms.txt' },
    })
  })

  it('parses docs with config key', () => {
    expect(parseCli(['docs', 'hono'])).toStrictEqual({
      ok: true,
      value: { kind: 'docs-key', key: 'hono', full: false },
    })
  })

  it('parses docs key with --full', () => {
    expect(parseCli(['docs', 'hono', '--full'])).toStrictEqual({
      ok: true,
      value: { kind: 'docs-key', key: 'hono', full: true },
    })
  })

  it('rejects search with no argument', () => {
    expect(parseCli(['search'])).toStrictEqual({
      ok: false,
      error: 'search command requires a URL or key argument.',
    })
  })

  it('rejects docs with no argument', () => {
    expect(parseCli(['docs'])).toStrictEqual({
      ok: false,
      error: 'docs command requires a URL or key argument.',
    })
  })

  it('rejects unknown command', () => {
    expect(parseCli(['unknown'])).toStrictEqual({
      ok: false,
      error: 'Unknown command: unknown. Run with --help for usage.',
    })
  })
})
