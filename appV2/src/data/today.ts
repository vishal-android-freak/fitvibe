import { useCallback, useEffect, useState } from 'react';
import { config } from '@/auth/config';
import { useAuth } from '@/auth';
import { fmtClock } from '@/data/mock';

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

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`);
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

interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Shared loader: runs `fetcher(userId)` for the signed-in user with state. */
function useUserResource<T>(fetcher: (userId: number) => Promise<T>): Resource<T> {
  const { session } = useAuth();
  const userId = session?.userId;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(userId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is a stable module-level function; only userId varies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => load(), [load]);

  return { data, loading, error, reload: load };
}

export function useTodaySummary(): Resource<TodaySummary> {
  return useUserResource(fetchTodaySummary);
}

export function useNutritionToday(): Resource<NutritionToday> {
  return useUserResource(fetchNutritionToday);
}
