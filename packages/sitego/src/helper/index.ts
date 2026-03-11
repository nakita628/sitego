/**
 * Fetches a URL and returns the response body as text.
 *
 * @remarks
 * Wraps the global `fetch` API with Result-type error handling.
 * Non-2xx responses return an error with the HTTP status code.
 * Network errors return an error with the exception message.
 *
 * @param url - The URL to fetch
 * @returns The response text on success, or an error message on failure
 */
export async function fetchResult(
  url: string,
): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }
    const text = await response.text()
    return { ok: true, value: text }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Fetch failed: ${message}` }
  }
}
