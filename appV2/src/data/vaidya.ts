/**
 * Vaidya agent service client — pre-generated insights (HTTP) and the live chat
 * WebSocket. Insights come from the cron-generated sessions, returned as a list
 * of GenerativeBlocks the app renders with <BlockRenderer> + an optional text
 * narrative.
 */

import { config } from '@/auth/config';
import { apiGetOrNull } from '@/data/api';
import { useResource, type Resource } from '@/data/useResource';
import { getIdToken } from '@/auth/firebase';
import type { GenerativeBlock } from '@/data/blocks';

/** Wire shape of a pull-insight response (mirrors http/server.ts). */
export interface InsightPayload {
  type: 'today_insight' | 'sleep' | 'day_insight';
  date: string;
  blocks: GenerativeBlock[];
  text: string;
  generatedAt: string;
}

async function fetchInsight(path: string): Promise<InsightPayload | null> {
  // 404 (no insight yet) surfaces as an error in apiGet; treat any failure as
  // "nothing yet" so the UI shows an empty state rather than an error.
  try {
    return await apiGetOrNull<InsightPayload>(path, config.vaidyaBaseUrl);
  } catch {
    return null;
  }
}

export const fetchTodayInsight = () => fetchInsight('/vaidya/insights/today');
export const fetchSleepInsight = (date?: string) =>
  fetchInsight(date ? `/vaidya/insights/sleep/${date}` : '/vaidya/insights/sleep');
export const fetchDayInsight = (date?: string) =>
  fetchInsight(date ? `/vaidya/insights/day/${date}` : '/vaidya/insights/day');

export type InsightState = Resource<InsightPayload>;

/** Today-tab headline insight. */
export function useTodayInsight(): InsightState {
  return useResource(fetchTodayInsight);
}

/** Per-sleep insight for a civil date (defaults to the latest). */
export function useSleepInsight(date?: string): InsightState {
  return useResource(() => fetchSleepInsight(date), [date]);
}

/** Nightly detailed day report (defaults to the latest). */
export function useDayInsight(date?: string): InsightState {
  return useResource(() => fetchDayInsight(date), [date]);
}

// --- Live chat over WebSocket ---------------------------------------------

export type ChatFrame =
  | { type: 'token'; delta: string }
  | { type: 'block'; block: GenerativeBlock }
  | { type: 'tool'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface ChatSocket {
  send: (message: string) => void;
  close: () => void;
}

/**
 * Open a Vaidya chat WebSocket. The Firebase ID token is passed as a query param
 * (RN WebSocket can't set Authorization headers reliably). `onFrame` receives
 * each streamed frame; `onOpen`/`onClose` are lifecycle callbacks.
 */
export async function openChat(handlers: {
  onFrame: (f: ChatFrame) => void;
  onOpen?: () => void;
  onClose?: (code: number) => void;
}): Promise<ChatSocket> {
  const token = await getIdToken(false);
  const base = config.vaidyaBaseUrl.replace(/^http/, 'ws');
  const url = `${base}/vaidya/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const ws = new WebSocket(url);

  ws.onopen = () => handlers.onOpen?.();
  ws.onmessage = (ev) => {
    try {
      handlers.onFrame(JSON.parse(String(ev.data)) as ChatFrame);
    } catch {
      /* ignore malformed frame */
    }
  };
  ws.onclose = (ev) => handlers.onClose?.(ev.code);

  return {
    send: (message: string) => ws.send(JSON.stringify({ message })),
    close: () => ws.close(),
  };
}
