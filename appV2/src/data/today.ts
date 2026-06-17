import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '@/auth/config';
import { useAuth } from '@/auth';
import { fmtClock } from '@/data/mock';
import { useRefreshRegister } from '@/data/refresh';

/** A timestamped reading in its own local zone. `value` is optional (omitted
 *  for timestamp-only stamps like nutrition "last updated"). */
export interface Stamped {
  value?: number;
  at: string; // RFC3339 (UTC)
  offsetSeconds: number; // local UTC offset for rendering wall-clock
}

/** Latest heart-rate sample with the instant it was measured. */
export type LatestHeartRate = Stamped & { value: number };

/** Today's live activity snapshot (steps + current heart rate). */
export interface TodaySummary {
  date: string;
  steps: number;
  latestHeartRate: LatestHeartRate | null;
}

/** Today's intake / energy / hydration totals. */
export interface NutritionToday {
  date: string;
  caloriesEaten: number;
  caloriesBurnt: number;
  carbsGrams: number;
  fatGrams: number;
  proteinGrams: number;
  hydrationMl: number;
  lastUpdated: Stamped | null; // most recent contributing entry today
}

/** One entry in the Today activity feed. */
export interface TimelineEvent {
  kind: 'tracked' | 'logged';
  category: 'workout' | 'wake' | 'meal' | 'water';
  at: string; // RFC3339 (UTC)
  offsetSeconds: number;
  title: string;
  detail: string;
  items?: string[]; // meal contents, when grouped
}

export interface TodayTimeline {
  date: string;
  events: TimelineEvent[];
}

/**
 * Format a stamped instant as a 12-hour "as of" clock (am/pm) in the reading's
 * OWN local zone (offsetSeconds), not the device zone.
 */
export function fmtStampClock(s: Stamped): string {
  const utcMs = Date.parse(s.at);
  if (Number.isNaN(utcMs)) return '';
  const local = new Date(utcMs + s.offsetSeconds * 1000);
  return fmtClock(local.getUTCHours() * 60 + local.getUTCMinutes());
}

/** How long a request may hang before we give up (server down / no network). */
const REQUEST_TIMEOUT_MS = 12000;

async function getJSON<T>(path: string): Promise<T> {
  // RN's fetch has no built-in timeout — without this, a dead server leaves the
  // promise pending forever and the pull-to-refresh spinner never hides.
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
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `Request failed (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

export function fetchTodaySummary(userId: number): Promise<TodaySummary> {
  return getJSON<TodaySummary>(`/me/today/summary?user_id=${userId}`);
}

export function fetchNutritionToday(userId: number): Promise<NutritionToday> {
  return getJSON<NutritionToday>(`/me/nutrition/today?user_id=${userId}`);
}

export function fetchTodayTimeline(userId: number): Promise<TodayTimeline> {
  return getJSON<TodayTimeline>(`/me/today/timeline?user_id=${userId}`);
}

interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Refetch; resolves when the request settles (for pull-to-refresh). */
  reload: () => Promise<void>;
}

/** Shared loader: runs `fetcher(userId)` for the signed-in user with state. */
function useUserResource<T>(fetcher: (userId: number) => Promise<T>): Resource<T> {
  const { session } = useAuth();
  const userId = session?.userId;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  // Mirror data in a ref so load() can tell an initial load (no data yet → show
  // the loading state) from a refresh (data present → keep showing it).
  const dataRef = useRef<T | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      if (mounted.current) {
        dataRef.current = null;
        setData(null);
        setLoading(false);
      }
      return;
    }
    // Only show the loading state when we have nothing to show yet. On refresh
    // (data already present) we keep the old data visible and let the
    // pull-to-refresh spinner be the only indicator.
    const isInitial = dataRef.current == null;
    if (mounted.current && isInitial) {
      setLoading(true);
    }
    try {
      const d = await fetcher(userId);
      if (mounted.current) {
        dataRef.current = d;
        setData(d);
        setError(null);
      }
    } catch (e: unknown) {
      // Keep the old data on a failed refresh — only surface the error when we
      // have nothing else to show.
      if (mounted.current && isInitial) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
    // fetcher is a stable module-level function; only userId varies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRefreshRegister(load);

  return { data, loading, error, reload: load };
}

export function useTodaySummary(): Resource<TodaySummary> {
  return useUserResource(fetchTodaySummary);
}

export function useNutritionToday(): Resource<NutritionToday> {
  return useUserResource(fetchNutritionToday);
}

export function useTodayTimeline(): Resource<TodayTimeline> {
  return useUserResource(fetchTodayTimeline);
}
