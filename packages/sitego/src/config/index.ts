import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function parseConfig(config: unknown) {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { ok: false, error: 'Invalid config: must be an object' } as const
  }

  const llms: Record<string, string> = {}
  const llmFull: Record<string, string> = {}

  for (const [field, raw] of Object.entries(config)) {
    const target = field === 'llms' ? llms : field === 'llm-full' ? llmFull : null
    if (!target) continue
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, error: `Invalid config: ${field} must be an object` } as const
    }
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v !== 'string') {
        return { ok: false, error: `Invalid config: ${field}.${k} must be a string` } as const
      }
      target[k] = v
    }
  }

  return { ok: true, value: { llms, 'llm-full': llmFull } } as const
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
