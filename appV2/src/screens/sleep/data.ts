import { accent, hue, status } from '@/theme';

/** Per-night sleep summaries, newest first; the day scroller indexes into this. */
export interface Night {
  rel: string;
  day: string;
  date: string;
  score: number;
  rating: 'Great' | 'Good' | 'Fair';
  dur: number;
  bed: number;
  wake: number;
  eff: number;
  rhr: number;
  hrv: number;
  spo2: number;
  resp: number;
  skin: number;
  moves: number;
  hrvDelta: string;
}

export const NIGHTS: Night[] = [
  { rel: 'Last night', day: 'Sun', date: 'Jun 15', score: 84, rating: 'Good', dur: 432, bed: 23 * 60 + 24, wake: 6 * 60 + 48, eff: 91, rhr: 48, hrv: 62, spo2: 97, resp: 14.2, skin: -0.3, moves: 14, hrvDelta: '4 ms' },
  { rel: 'Sat night', day: 'Sat', date: 'Jun 14', score: 76, rating: 'Fair', dur: 388, bed: 23 * 60 + 58, wake: 6 * 60 + 42, eff: 87, rhr: 51, hrv: 55, spo2: 96, resp: 14.8, skin: 0.1, moves: 22, hrvDelta: '3 ms' },
  { rel: 'Fri night', day: 'Fri', date: 'Jun 13', score: 81, rating: 'Good', dur: 441, bed: 23 * 60 + 36, wake: 6 * 60 + 55, eff: 89, rhr: 49, hrv: 59, spo2: 97, resp: 14.1, skin: -0.2, moves: 17, hrvDelta: '2 ms' },
  { rel: 'Thu night', day: 'Thu', date: 'Jun 12', score: 69, rating: 'Fair', dur: 356, bed: 24 * 60 + 14, wake: 6 * 60 + 30, eff: 83, rhr: 53, hrv: 51, spo2: 95, resp: 15.2, skin: 0.3, moves: 28, hrvDelta: '6 ms' },
  { rel: 'Wed night', day: 'Wed', date: 'Jun 11', score: 88, rating: 'Great', dur: 468, bed: 22 * 60 + 58, wake: 6 * 60 + 46, eff: 93, rhr: 47, hrv: 66, spo2: 98, resp: 13.8, skin: -0.4, moves: 11, hrvDelta: '5 ms' },
  { rel: 'Tue night', day: 'Tue', date: 'Jun 10', score: 79, rating: 'Good', dur: 410, bed: 23 * 60 + 40, wake: 6 * 60 + 30, eff: 88, rhr: 50, hrv: 58, spo2: 97, resp: 14.4, skin: 0.0, moves: 19, hrvDelta: '1 ms' },
  { rel: 'Mon night', day: 'Mon', date: 'Jun 9', score: 73, rating: 'Fair', dur: 372, bed: 24 * 60 + 6, wake: 6 * 60 + 18, eff: 85, rhr: 52, hrv: 54, spo2: 96, resp: 15.0, skin: 0.2, moves: 24, hrvDelta: '2 ms' },
];

export const TARGET_BED = 23 * 60; // 11:00 PM
export const TARGET_WAKE = 6 * 60 + 45; // 6:45 AM

/** Minutes-since-midnight → 12-hour clock string ("11:24 PM"). */
export function clk(c: number): string {
  c = ((c % 1440) + 1440) % 1440;
  const h = Math.floor(c / 60);
  const m = c % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export function fmtH(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function delta(actual: number, target: number): string {
  const d = actual - target;
  const sign = d > 0 ? '+' : d < 0 ? '−' : '';
  return `${sign}${Math.abs(d)}m`;
}

export function ratingHue(r: Night['rating']): string {
  return r === 'Great' ? hue.move : r === 'Good' ? accent.base : status.warning;
}
