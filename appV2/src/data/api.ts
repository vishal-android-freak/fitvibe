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
export async function apiSend<T>(method: 'PUT' | 'POST', path: string, body: unknown): Promise<T | null> {
  let idToken = await getIdToken(false);
  let res = await doSend(method, path, body, idToken);
  if (res.status === 401) {
    idToken = await getIdToken(true);
    if (idToken) res = await doSend(method, path, body, idToken);
  }
  if (res.status !== 204 && !res.ok) {
    throw new Error(`Request failed (HTTP ${res.status})`);
  }
  if (res.status === 204) return null;
  return (await res.json()) as T;
}

async function doSend(method: string, path: string, body: unknown, idToken: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  try {
    return await fetch(`${config.apiBaseUrl}${path}`, { method, headers, body: JSON.stringify(body), signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out — is the server reachable?');
    throw e instanceof Error ? e : new Error('Network request failed');
  } finally {
    clearTimeout(timer);
  }
}

async function request(path: string, baseUrl?: string): Promise<Response> {
  // Attach the Firebase ID token (null before sign-in / on public auth routes).
  // On a 401 we retry ONCE with a force-refreshed token, in case ours expired
  // mid-session.
  let res = await doFetch(path, await getIdToken(false), baseUrl);
  if (res.status === 401) {
    const fresh = await getIdToken(true);
    if (fresh) res = await doFetch(path, fresh, baseUrl);
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

async function doFetch(path: string, idToken: string | null, baseUrl?: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = {};
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  try {
    return await fetch(`${baseUrl ?? config.apiBaseUrl}${path}`, { headers, signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Request timed out — is the server reachable?');
    }
    throw e instanceof Error ? e : new Error('Network request failed');
  } finally {
    clearTimeout(timer);
  }
}
