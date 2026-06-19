import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/auth';
import { apiGet } from '@/data/api';
import { fmtClock } from '@/data/mock';
import { useRefreshRegister } from '@/data/refresh';
import { type Resource } from '@/data/useResource';
import { decodeSleep, type LastNight, type SleepWire } from '@/data/sleep';

/** A timestamped reading in its own local zone. `value` is optional (omitted
 *  for timestamp-only stamps like nutrition "last updated"). */
export interface Stamped {
  value?: number;
  at: string; // RFC3339 (UTC)
  offsetSeconds: number; // local UTC offset for rendering wall-clock
}

/** Latest heart-rate sample with the instant it was measured. */
export type LatestHeartRate = Stamped & { value: number };

/** Activity snapshot — steps + current heart rate. */
export interface TodaySummary {
  steps: number;
  latestHeartRate: LatestHeartRate | null;
}

/** Today's intake / energy / hydration totals. */
export interface NutritionToday {
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

/** Readiness score for the Today center ring (mirrors backend readiness.Score). */
export interface Readiness {
  value: number | null; // 0-100; null until warmed up (≥7 HRV days)
  band: string; // High | Moderate | Low (empty when value is null)
  date?: string; // civil date the score reflects (may lag today by a day)
  calibrated: boolean; // false until ~30 days of baseline
}

/** The whole Today screen in one payload (mirrors GET /me/today). */
export interface Today {
  date: string;
  summary: TodaySummary;
  nutrition: NutritionToday;
  timeline: TimelineEvent[];
  sleep: LastNight | null; // null if no sleep recorded
  readiness: Readiness;
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

/** The Today aggregate's wire shape (sleep arrives in backend/wire form). */
interface TodayWire extends Omit<Today, 'sleep'> {
  sleep: SleepWire | null;
}

/** Fetch the whole Today screen in one request. The signed-in user is derived
 *  from the auth token (no query param). */
export async function fetchToday(): Promise<Today> {
  const w = await apiGet<TodayWire>(`/me/today`);
  return { ...w, sleep: decodeSleep(w.sleep) };
}

// --- Shared Today store ---------------------------------------------------
// One source of truth for the whole Today screen so that every section can call
// useToday() independently (no prop-threading) while only ONE /me/today request
// is in flight. A single in-flight promise dedups concurrent loads.

interface TodayState {
  data: Today | null;
  loading: boolean;
  error: string | null;
}

let todayState: TodayState = { data: null, loading: true, error: null };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadToday(): Promise<void> {
  // Dedup: if a load is already running, await it instead of starting another.
  if (inFlight) return inFlight;
  // Show the loading state only on the first load; on refresh keep old data.
  if (todayState.data == null) todayState = { ...todayState, loading: true };
  emit();

  inFlight = (async () => {
    try {
      const d = await fetchToday();
      todayState = { data: d, loading: false, error: null };
    } catch (e: unknown) {
      // Keep old data on a failed refresh; surface the error only with nothing to show.
      todayState = {
        data: todayState.data,
        loading: false,
        error: todayState.data == null ? (e instanceof Error ? e.message : 'Failed to load') : todayState.error,
      };
    } finally {
      inFlight = null;
      emit();
    }
  })();
  return inFlight;
}

/**
 * The single hook the whole Today screen uses. Every section calls it; they
 * share one request and one refresh. Returns the full Today payload — sections
 * read `data.summary`, `data.nutrition`, `data.timeline`, `data.sleep`.
 */
export function useToday(): Resource<Today> {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const [, force] = useState(0);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const reload = useCallback(async () => {
    if (signedIn) await loadToday();
  }, [signedIn]);

  // Initial load once signed in.
  useEffect(() => {
    if (signedIn) void loadToday();
  }, [signedIn]);

  useRefreshRegister(reload);

  return { data: todayState.data, loading: todayState.loading, error: todayState.error, reload };
}
