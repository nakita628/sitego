import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function parseConfig(config: unknown) {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { ok: false, error: 'Invalid config: must be an object' } as const
  }
  const search = 'search' in config ? config.search : {}
  if (
    !((v: unknown): v is { [k: string]: string } => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
      for (const x of Object.values(v)) {
        if (typeof x !== 'string') return false
      }
      return true
    })(search)
  ) {
    return { ok: false, error: 'Invalid config: search must be an object of strings' } as const
  }
  for (const [k, v] of Object.entries(search)) {
    if (!(v.startsWith('http://') || v.startsWith('https://'))) {
      return {
        ok: false,
        error: `Invalid config: search.${k} must be a URL starting with http:// or https://`,
      } as const
    }
  }
  const llms = 'llms' in config ? config.llms : {}
  if (
    !((v: unknown): v is { [k: string]: string } => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
      for (const x of Object.values(v)) {
        if (typeof x !== 'string') return false
      }
      return true
    })(llms)
  ) {
    return { ok: false, error: 'Invalid config: llms must be an object of strings' } as const
  }
  for (const [k, v] of Object.entries(llms)) {
    if (!(v.startsWith('http://') || v.startsWith('https://'))) {
      return {
        ok: false,
        error: `Invalid config: llms.${k} must be a URL starting with http:// or https://`,
      } as const
    }
  }
  const llmFull = 'llm-full' in config ? config['llm-full'] : {}
  if (
    !((v: unknown): v is { [k: string]: string } => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
      for (const x of Object.values(v)) {
        if (typeof x !== 'string') return false
      }
      return true
    })(llmFull)
  ) {
    return { ok: false, error: 'Invalid config: llm-full must be an object of strings' } as const
  }
  for (const [k, v] of Object.entries(llmFull)) {
    if (!(v.startsWith('http://') || v.startsWith('https://'))) {
      return {
        ok: false,
        error: `Invalid config: llm-full.${k} must be a URL starting with http:// or https://`,
      } as const
    }
  }
  return {
    ok: true,
    value: {
      search: search,
      llms: llms,
      'llm-full': llmFull,
    },
  } as const
}

export async function readConfig() {
  const cwd = process.env.INIT_CWD ?? process.cwd()
  const abs = resolve(cwd, 'sitego.config.ts')
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
  readonly search?: { readonly [k: string]: string }
  readonly llms?: { readonly [k: string]: string }
  readonly 'llm-full'?: { readonly [k: string]: string }
}) {
  return config
}
