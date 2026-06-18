import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/auth';
import { useRefreshRegister } from '@/data/refresh';

/** A loadable, refreshable resource keyed off the signed-in user. */
export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Refetch; resolves when the request settles (for pull-to-refresh). */
  reload: () => Promise<void>;
}

/**
 * Loads a per-user resource with the app's standard semantics:
 * - shows `loading` only on the first load; keeps stale data visible on refresh,
 * - surfaces an `error` only when there's nothing to show (initial failure),
 * - guards every setState behind a mounted ref,
 * - registers `reload` with the enclosing RefreshScope (pull-to-refresh).
 *
 * `fetcher` receives the user id and returns the data (or null for "none yet").
 * Pass any extra inputs the fetcher closes over (e.g. a limit) in `deps`.
 */
export function useResource<T>(
  fetcher: () => Promise<T | null>,
  deps: readonly unknown[] = [],
): Resource<T> {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  // `null` data is a valid result, so track first-load separately rather than
  // inferring it from data being null.
  const hasLoaded = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!signedIn) {
      if (mounted.current) {
        setData(null);
        setLoading(false);
      }
      return;
    }
    const isInitial = !hasLoaded.current;
    if (mounted.current && isInitial) setLoading(true);
    try {
      const result = await fetcher();
      if (mounted.current) {
        hasLoaded.current = true;
        setData(result);
        setError(null);
      }
    } catch (e: unknown) {
      // Keep old data on a failed refresh; only surface the error initially.
      if (mounted.current && isInitial) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
    // `fetcher` is recreated each render by callers; track the real inputs via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);
  useRefreshRegister(load);

  return { data, loading, error, reload: load };
}
