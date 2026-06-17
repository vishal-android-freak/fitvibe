import { config } from '@/auth/config';

/** How long a request may hang before we give up (server down / no network).
 *  RN's fetch has no built-in timeout — without this a dead server leaves the
 *  promise pending forever and a pull-to-refresh spinner never hides. */
const REQUEST_TIMEOUT_MS = 12000;

/**
 * GET `path` (relative to the backend base URL) and decode the JSON body as `T`.
 * Adds a timeout, normalizes network/abort errors, and surfaces the backend's
 * `{error}` body on non-2xx. This is the single place request scaffolding lives.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(path);
  return (await res.json()) as T;
}

/**
 * Like {@link apiGet} but treats `204 No Content` as a valid empty result and
 * returns `null` (e.g. "no sleep recorded yet").
 */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const res = await request(path);
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

async function request(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, { signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out — is the server reachable?');
    }
    throw e instanceof Error ? e : new Error('Network request failed');
  } finally {
    clearTimeout(timer);
  }
  if (res.status !== 204 && !res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `Request failed (HTTP ${res.status})`);
  }
  return res;
}
