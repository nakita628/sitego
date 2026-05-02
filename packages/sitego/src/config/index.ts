import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function parseConfig(config: unknown) {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { ok: false, error: 'Invalid config: must be an object' } as const
  }
  const llms = 'llms' in config ? config.llms : {}
  if (typeof llms !== 'object' || llms === null || Array.isArray(llms)) {
    return { ok: false, error: 'Invalid config: llms must be an object' } as const
  }
  for (const [k, v] of Object.entries(llms)) {
    if (typeof v !== 'string') {
      return { ok: false, error: `Invalid config: llms.${k} must be a string` } as const
    }
  }
  const llmFull = 'llm-full' in config ? config['llm-full'] : {}
  if (typeof llmFull !== 'object' || llmFull === null || Array.isArray(llmFull)) {
    return { ok: false, error: 'Invalid config: llm-full must be an object' } as const
  }
  for (const [k, v] of Object.entries(llmFull)) {
    if (typeof v !== 'string') {
      return { ok: false, error: `Invalid config: llm-full.${k} must be a string` } as const
    }
  }
  return {
    ok: true,
    value: {
      llms: llms as { [k: string]: string },
      'llm-full': llmFull as { [k: string]: string },
    },
  } as const
}

export async function readConfig() {
  const abs = resolve(process.cwd(), 'sitego.config.ts')
  if (!existsSync(abs)) return { ok: false, error: `Config not found: ${abs}` } as const
  try {
    const mod: { readonly default?: unknown } = await import(pathToFileURL(abs).href)
    if (mod.default === undefined) {
      return { ok: false, error: 'Config must export default object' } as const
    }
    return parseConfig(mod.default)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) } as const
  }
}

export function defineConfig(config: {
  readonly llms?: { readonly [k: string]: string }
  readonly 'llm-full'?: { readonly [k: string]: string }
}) {
  return {
    llms: config.llms ?? {},
    'llm-full': config['llm-full'] ?? {},
  }
}
