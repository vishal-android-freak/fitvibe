import { config } from '@/auth/config';
import { getIdToken } from '@/auth/firebase';

/** How long a request may hang before we give up (server down / no network).
 *  RN's fetch has no built-in timeout — without this a dead server leaves the
 *  promise pending forever and a pull-to-refresh spinner never hides. */
const REQUEST_TIMEOUT_MS = 12000;

/**
 * GET `path` (relative to the backend base URL) and decode the JSON body as `T`.
 * Adds a timeout, normalizes network/abort errors, and surfaces the backend's
 * `{error}` body on non-2xx. This is the single place request scaffolding lives.
 */
export async function apiGet<T>(path: string, baseUrl?: string): Promise<T> {
  const res = await request(path, baseUrl);
  return (await res.json()) as T;
}

/**
 * Like {@link apiGet} but treats `204 No Content` as a valid empty result and
 * returns `null` (e.g. "no sleep recorded yet").
 */
export async function apiGetOrNull<T>(path: string, baseUrl?: string): Promise<T | null> {
  const res = await request(path, baseUrl);
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

/** PUT/POST `path` with a JSON `body`, authenticated with the Firebase ID
 *  token. Throws on non-2xx. Use for writes (e.g. the sleep schedule). */
export async function apiSend<T>(method: 'PUT' | 'POST', path: string, body: unknown, baseUrl?: string): Promise<T | null> {
  const send = (idToken: string | null) =>
    fetchWithTimeout(path, {
      method,
      headers: authHeaders(idToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    }, baseUrl);

  let res = await send(await getIdToken(false));
  if (res.status === 401) {
    const fresh = await getIdToken(true);
    if (fresh) res = await send(fresh);
  }
  if (res.status !== 204 && !res.ok) {
    throw new Error(`Request failed (HTTP ${res.status})`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

async function request(path: string, baseUrl?: string): Promise<Response> {
  // Attach the Firebase ID token (null before sign-in / on public auth routes).
  // On a 401 we retry ONCE with a force-refreshed token, in case ours expired
  // mid-session.
  const get = (idToken: string | null) =>
    fetchWithTimeout(path, { headers: authHeaders(idToken) }, baseUrl);

  let res = await get(await getIdToken(false));
  if (res.status === 401) {
    const fresh = await getIdToken(true);
    if (fresh) res = await get(fresh);
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

/** Build request headers with the optional bearer token merged in. */
function authHeaders(idToken: string | null, base: Record<string, string> = {}): Record<string, string> {
  if (idToken) base.Authorization = `Bearer ${idToken}`;
  return base;
}

/** fetch with a hard timeout (RN's fetch has none) and normalized network/abort
 *  errors. The single place the AbortController + timeout dance lives. */
async function fetchWithTimeout(path: string, init: RequestInit, baseUrl?: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl ?? config.apiBaseUrl}${path}`, { ...init, signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out — is the server reachable?');
    throw e instanceof Error ? e : new Error('Network request failed');
  } finally {
    clearTimeout(timer);
  }
}
