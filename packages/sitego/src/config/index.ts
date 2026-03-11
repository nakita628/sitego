import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { register } from 'tsx/esm/api'

/** A string-keyed map of URL values. */
type UrlMap = { readonly [k: string]: string }

/** The resolved configuration shape with both fields guaranteed present. */
type SitegoConfig = {
  readonly llms: UrlMap
  readonly 'llm-full': UrlMap
}

/**
 * Creates a typed configuration object for `sitego.config.ts`.
 *
 * @remarks
 * This function provides type inference and default values for the config file.
 * Missing fields default to empty objects.
 *
 * @param config - Configuration with optional `llms` and `llm-full` URL maps
 * @returns Normalized config with both fields guaranteed present
 */
function defineConfig(config: {
  readonly llms?: UrlMap
  readonly 'llm-full'?: UrlMap
}): SitegoConfig {
  return {
    llms: config.llms ?? {},
    'llm-full': config['llm-full'] ?? {},
  }
}

function isRecord(value: unknown): value is { [k: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateLlmsRecord(
  value: unknown,
  field: string,
): { readonly ok: true; readonly value: UrlMap } | { readonly ok: false; readonly error: string } {
  if (value === undefined) {
    return { ok: true, value: {} }
  }
  if (!isRecord(value)) {
    return { ok: false, error: `Invalid config: ${field} must be an object` }
  }
  for (const [key, url] of Object.entries(value)) {
    if (typeof url !== 'string') {
      return { ok: false, error: `Invalid config: ${field}.${key} must be a string` }
    }
  }
  return { ok: true, value: value as UrlMap }
}

/**
 * Validates and parses a raw config object.
 *
 * @remarks
 * Ensures the config is an object with optional `llms` and `llm-full` fields,
 * each being a `{ [k: string]: string }`. Returns a Result type.
 *
 * @param config - Raw config value (typically from dynamic import)
 * @returns Parsed config or validation error
 */
function parseConfig(
  config: unknown,
):
  | { readonly ok: true; readonly value: SitegoConfig }
  | { readonly ok: false; readonly error: string } {
  if (!isRecord(config)) {
    return { ok: false, error: 'Invalid config: must be an object' }
  }

  const llmsResult = validateLlmsRecord(config['llms'], 'llms')
  if (!llmsResult.ok) return llmsResult

  const llmFullResult = validateLlmsRecord(config['llm-full'], 'llm-full')
  if (!llmFullResult.ok) return llmFullResult

  return {
    ok: true,
    value: {
      llms: llmsResult.value,
      'llm-full': llmFullResult.value,
    },
  }
}

/**
 * Reads and parses `sitego.config.ts` from the current working directory.
 *
 * @remarks
 * Uses `tsx` to dynamically import the TypeScript config file. The file
 * must have a default export created by {@link defineConfig}.
 * Returns an error if the file is not found or fails validation.
 *
 * @returns Parsed config or error message
 */
async function readConfig(): Promise<
  | { readonly ok: true; readonly value: SitegoConfig }
  | { readonly ok: false; readonly error: string }
> {
  const abs = resolve(process.cwd(), 'sitego.config.ts')
  if (!existsSync(abs)) return { ok: false, error: `Config not found: ${abs}` }

  const unregister = register()

  try {
    const url = pathToFileURL(abs).href
    const mod: { readonly default?: unknown } = await import(url)
    if (!('default' in mod) || mod.default === undefined) {
      return { ok: false, error: 'Config must export default object' }
    }
    return parseConfig(mod.default)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    unregister()
  }
}

export { defineConfig, parseConfig, readConfig }
export type { SitegoConfig, UrlMap }
