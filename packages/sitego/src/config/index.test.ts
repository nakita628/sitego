import { describe, it, expect } from 'vite-plus/test'

import { parseConfig, defineConfig } from './index.ts'

describe('defineConfig', () => {
  it('returns the input as-is when empty', () => {
    expect(defineConfig({})).toStrictEqual({})
  })

  it('returns the input as-is with values', () => {
    const input = {
      search: { example: 'https://example.com' },
      llms: { hono: 'https://hono.dev/llms.txt' },
      'llm-full': { vite: 'https://vite.dev/llm-full.txt' },
    }
    expect(defineConfig(input)).toStrictEqual(input)
  })
})

describe('parseConfig', () => {
  it('parses valid config', () => {
    const result = parseConfig({
      search: { example: 'https://example.com' },
      llms: { hono: 'https://hono.dev/llms.txt', vite: 'https://vite.dev/llms.txt' },
      'llm-full': { hono: 'https://hono.dev/llm-full.txt' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.search).toStrictEqual({ example: 'https://example.com' })
      expect(result.value.llms).toStrictEqual({
        hono: 'https://hono.dev/llms.txt',
        vite: 'https://vite.dev/llms.txt',
      })
      expect(result.value['llm-full']).toStrictEqual({
        hono: 'https://hono.dev/llm-full.txt',
      })
    }
  })

  it('defaults to empty objects when fields are omitted', () => {
    const result = parseConfig({})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.search).toStrictEqual({})
      expect(result.value.llms).toStrictEqual({})
      expect(result.value['llm-full']).toStrictEqual({})
    }
  })

  it('rejects non-object config', () => {
    const result = parseConfig('invalid')
    expect(result).toStrictEqual({ ok: false, error: 'Invalid config: must be an object' })
  })

  it('rejects non-object search', () => {
    const result = parseConfig({ search: 'invalid' })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: search must be an object of strings',
    })
  })

  it('rejects array search', () => {
    const result = parseConfig({ search: ['invalid'] })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: search must be an object of strings',
    })
  })

  it('rejects non-string values in search', () => {
    const result = parseConfig({ search: { example: 123 } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: search must be an object of strings',
    })
  })

  it('rejects non-URL values in search', () => {
    const result = parseConfig({ search: { example: 'not a url' } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: search.example must be a URL starting with http:// or https://',
    })
  })

  it('rejects non-URL values in llms', () => {
    const result = parseConfig({ llms: { hono: 'ftp://hono.dev' } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llms.hono must be a URL starting with http:// or https://',
    })
  })

  it('rejects non-URL values in llm-full', () => {
    const result = parseConfig({ 'llm-full': { hono: '' } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llm-full.hono must be a URL starting with http:// or https://',
    })
  })

  it('accepts http:// values', () => {
    const result = parseConfig({ search: { example: 'http://example.com' } })
    expect(result.ok).toBe(true)
  })

  it('rejects non-object llms', () => {
    const result = parseConfig({ llms: 'invalid' })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llms must be an object of strings',
    })
  })

  it('rejects array llms', () => {
    const result = parseConfig({ llms: ['invalid'] })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llms must be an object of strings',
    })
  })

  it('rejects non-string values in llms', () => {
    const result = parseConfig({ llms: { hono: 123 } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llms must be an object of strings',
    })
  })

  it('rejects non-object llm-full', () => {
    const result = parseConfig({ 'llm-full': 'invalid' })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llm-full must be an object of strings',
    })
  })
})

describe('readConfig with fixture', async () => {
  const { readConfig } = await import('./index.ts')
  const { resolve } = await import('node:path')
  const fixturesDir = resolve(import.meta.dirname, '../../../../fixtures')
  const originalCwd = process.cwd
  const originalInitCwd = process.env.INIT_CWD

  it('reads fixture config file via process.cwd', async () => {
    delete process.env.INIT_CWD
    process.cwd = () => fixturesDir
    const result = await readConfig()
    process.cwd = originalCwd
    if (originalInitCwd !== undefined) process.env.INIT_CWD = originalInitCwd

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.search).toStrictEqual({
        hono: 'https://hono.dev/',
      })
      expect(result.value.llms).toStrictEqual({
        hono: 'https://hono.dev/llms.txt',
        vite: 'https://vite.dev/llms.txt',
      })
      expect(result.value['llm-full']).toStrictEqual({
        hono: 'https://hono.dev/llms-full.txt',
        vite: 'https://vite.dev/llms-full.txt',
      })
    }
  })

  it('prefers INIT_CWD over process.cwd', async () => {
    process.env.INIT_CWD = fixturesDir
    process.cwd = () => resolve(fixturesDir, 'nonexistent')
    const result = await readConfig()
    process.cwd = originalCwd
    if (originalInitCwd === undefined) delete process.env.INIT_CWD
    else process.env.INIT_CWD = originalInitCwd

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.search.hono).toBe('https://hono.dev/')
    }
  })

  it('returns error when config file not found', async () => {
    delete process.env.INIT_CWD
    process.cwd = () => resolve(fixturesDir, 'nonexistent')
    const result = await readConfig()
    process.cwd = originalCwd
    if (originalInitCwd !== undefined) process.env.INIT_CWD = originalInitCwd

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(
        `Config not found: ${resolve(fixturesDir, 'nonexistent', 'sitego.config.ts')}`,
      )
    }
  })
})
