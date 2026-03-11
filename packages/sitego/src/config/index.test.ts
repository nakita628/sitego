import { describe, it, expect } from 'vitest'

import { parseConfig, defineConfig } from './index.ts'

describe('defineConfig', () => {
  it('returns config with defaults when no options provided', () => {
    const config = defineConfig({})
    expect(config).toStrictEqual({ llms: {}, 'llm-full': {} })
  })

  it('returns config with provided values', () => {
    const config = defineConfig({
      llms: { hono: 'https://hono.dev/llms.txt' },
      'llm-full': { vite: 'https://vite.dev/llm-full.txt' },
    })
    expect(config.llms).toStrictEqual({ hono: 'https://hono.dev/llms.txt' })
    expect(config['llm-full']).toStrictEqual({ vite: 'https://vite.dev/llm-full.txt' })
  })
})

describe('parseConfig', () => {
  it('parses valid config', () => {
    const result = parseConfig({
      llms: { hono: 'https://hono.dev/llms.txt', vite: 'https://vite.dev/llms.txt' },
      'llm-full': { hono: 'https://hono.dev/llm-full.txt' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
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
      expect(result.value.llms).toStrictEqual({})
      expect(result.value['llm-full']).toStrictEqual({})
    }
  })

  it('rejects non-object config', () => {
    const result = parseConfig('invalid')
    expect(result).toStrictEqual({ ok: false, error: 'Invalid config: must be an object' })
  })

  it('rejects non-object llms', () => {
    const result = parseConfig({ llms: 'invalid' })
    expect(result).toStrictEqual({ ok: false, error: 'Invalid config: llms must be an object' })
  })

  it('rejects array llms', () => {
    const result = parseConfig({ llms: ['invalid'] })
    expect(result).toStrictEqual({ ok: false, error: 'Invalid config: llms must be an object' })
  })

  it('rejects non-string values in llms', () => {
    const result = parseConfig({ llms: { hono: 123 } })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llms.hono must be a string',
    })
  })

  it('rejects non-object llm-full', () => {
    const result = parseConfig({ 'llm-full': 'invalid' })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: llm-full must be an object',
    })
  })
})

describe('readConfig with fixture', async () => {
  const { readConfig } = await import('./index.ts')
  const { resolve } = await import('node:path')
  const fixturesDir = resolve(import.meta.dirname, '../../../../fixtures')
  const originalCwd = process.cwd

  it('reads fixture config file', async () => {
    process.cwd = () => fixturesDir
    const result = await readConfig()
    process.cwd = originalCwd

    expect(result.ok).toBe(true)
    if (result.ok) {
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

  it('returns error when config file not found', async () => {
    process.cwd = () => resolve(fixturesDir, 'nonexistent')
    const result = await readConfig()
    process.cwd = originalCwd

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(
        `Config not found: ${resolve(fixturesDir, 'nonexistent', 'sitego.config.ts')}`,
      )
    }
  })
})
