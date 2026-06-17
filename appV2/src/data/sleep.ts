import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '@/auth/config';
import { useAuth } from '@/auth';
import { useRefreshRegister } from '@/data/refresh';
import type { SleepSegment, SleepStage } from '@/components';

/** Per-stage roll-up for the breakdown bars. */
export interface SleepStageTotal {
  stage: SleepStage;
  minutes: number;
  percent: number;
  /** How many distinct times the stage was entered (awakenings for Awake). */
  count: number;
}

/** Typical stage distribution for the user's age (fractions, 0–1). */
export interface TypicalStages {
  deep: number;
  rem: number;
  light: number;
  awake: number;
}

/** The decoded last-night payload (mirrors backend lastNightResponse). */
export interface LastNight {
  segments: SleepSegment[];
  onsetClock: number;
  wakeClock: number;
  totalMinutes: number;
  asleepMinutes: number;
  efficiency: number;
  awakenings: number;
  stages: SleepStageTotal[];
  typical: TypicalStages;
}

interface WireSegment {
  stage: SleepStage;
  minutes: number;
}

interface WireResponse {
  segments: WireSegment[];
  onsetClock: number;
  wakeClock: number;
  totalMinutes: number;
  asleepMinutes: number;
  efficiency: number;
  awakenings: number;
  stages: SleepStageTotal[];
  typical: TypicalStages;
}

function decode(r: WireResponse): LastNight {
  return {
    segments: r.segments.map((s) => [s.stage, s.minutes] as SleepSegment),
    onsetClock: r.onsetClock,
    wakeClock: r.wakeClock,
    totalMinutes: r.totalMinutes,
    asleepMinutes: r.asleepMinutes,
    efficiency: r.efficiency,
    awakenings: r.awakenings,
    stages: r.stages,
    typical: r.typical,
  };
}

/** Fetches the user's most recent sleep night. Returns null when there is none. */
export async function fetchLastNight(userId: number): Promise<LastNight | null> {
  const res = await fetch(`${config.apiBaseUrl}/me/sleep/last-night?user_id=${userId}`);
  if (res.status === 204) return null; // no sleep recorded yet
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `Failed to load sleep (HTTP ${res.status})`);
  }
  return decode((await res.json()) as WireResponse);
}

export interface LastNightState {
  data: LastNight | null;
  loading: boolean;
  error: string | null;
  /** Refetch; resolves when the request settles (for pull-to-refresh). */
  reload: () => Promise<void>;
}

/** Loads last night's sleep for the signed-in user, with loading/error/empty states. */
export function useLastNight(): LastNightState {
  const { session } = useAuth();
  const userId = session?.userId;
  const [data, setData] = useState<LastNight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      if (mounted.current) {
        setData(null);
        setLoading(false);
      }
      return;
    }
    if (mounted.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const night = await fetchLastNight(userId);
      if (mounted.current) setData(night);
    } catch (e: unknown) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to load sleep');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRefreshRegister(load);

  return { data, loading, error, reload: load };
}
