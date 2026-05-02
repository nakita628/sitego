export async function fetchResult(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` } as const
    }
    return { ok: true, value: await response.text() } as const
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    } as const
  }
}
