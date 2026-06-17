import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '@/auth/config';
import { useAuth } from '@/auth';
import { apiGet, apiGetOrNull } from '@/data/api';
import { useResource, type Resource } from '@/data/useResource';
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

/** Backend sleep payload shape (also embedded in GET /me/today). */
export interface SleepWire {
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

/** Decode the backend sleep payload into the app's LastNight shape. Exported so
 *  the Today aggregate can decode its embedded sleep block. */
export function decodeSleep(r: SleepWire | null): LastNight | null {
  return r ? decode(r) : null;
}

function decode(r: SleepWire): LastNight {
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
  const wire = await apiGetOrNull<SleepWire>(`/me/sleep/last-night?user_id=${userId}`);
  return wire ? decode(wire) : null;
}

export type LastNightState = Resource<LastNight>;

/** Loads last night's sleep for the signed-in user, with loading/error/empty states. */
export function useLastNight(): LastNightState {
  return useResource(fetchLastNight);
}

// --- Recent nights (Sleep tab: day scroller, vitals, weekly trend) --------

/** Per-night vitals; any field may be null when that vital wasn't recorded. */
export interface NightVitals {
  rhr: number | null;
  hrv: number | null;
  spo2: number | null;
  respiratoryRate: number | null;
  skinTempDelta: number | null;
}

/** One night's summary (mirrors backend nightSummary). */
export interface SleepNight {
  date: string; // local civil date, "2006-01-02"
  onsetClock: number; // minutes since local midnight
  wakeClock: number;
  durationMinutes: number; // asleep
  efficiency: number;
  awakenings: number;
  stages: SleepStageTotal[];
  vitals: NightVitals;
}

interface NightsWire {
  nights: SleepNight[];
}

export async function fetchSleepNights(userId: number, limit = 7): Promise<SleepNight[]> {
  const w = await apiGet<NightsWire>(`/me/sleep/nights?user_id=${userId}&limit=${limit}`);
  return w.nights ?? [];
}

export interface SleepNightsState {
  nights: SleepNight[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Loads the last N nights for the Sleep tab. Keeps old data on refresh. */
export function useSleepNights(limit = 7): SleepNightsState {
  const { data, loading, error, reload } = useResource(
    (userId) => fetchSleepNights(userId, limit),
    [limit],
  );
  return { nights: data ?? [], loading, error, reload };
}

// --- User sleep schedule (target bed/wake) --------------------------------

/** Target bed/wake as minutes since local midnight; null when unset. */
export interface SleepSchedule {
  targetBedMinutes: number | null;
  targetWakeMinutes: number | null;
}

export interface SleepScheduleState {
  schedule: SleepSchedule;
  loading: boolean;
  save: (next: SleepSchedule) => Promise<void>;
}

/** Loads + saves the user's sleep-schedule target (GET/PUT /me/sleep/schedule). */
export function useSleepSchedule(): SleepScheduleState {
  const { session } = useAuth();
  const userId = session?.userId;
  const [schedule, setSchedule] = useState<SleepSchedule>({ targetBedMinutes: null, targetWakeMinutes: null });
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`${config.apiBaseUrl}/me/sleep/schedule?user_id=${userId}`)
      .then((r) => (r.ok ? (r.json() as Promise<SleepSchedule>) : null))
      .then((s) => {
        if (!cancelled && mounted.current && s) setSchedule(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback(
    async (next: SleepSchedule) => {
      if (!userId) return;
      setSchedule(next); // optimistic
      await fetch(`${config.apiBaseUrl}/me/sleep/schedule?user_id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    },
    [userId],
  );

  return { schedule, loading, save };
}
