import { accent, hue, status } from '@/theme';
import type { SleepNight } from '@/data/sleep';

/** Target schedule the ScheduleCard compares against. */
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

export type Rating = 'Great' | 'Good' | 'Fair';

export function ratingHue(r: Rating): string {
  return r === 'Great' ? hue.move : r === 'Good' ? accent.base : status.warning;
}

/**
 * A night adapted for the Sleep-tab view, derived from the API SleepNight plus
 * computed labels (rel/day/date) and a rating bucketed from efficiency. The raw
 * API night is kept on `.raw` for components that need stages/vitals directly.
 */
export interface NightView {
  raw: SleepNight;
  rel: string; // "Last night", "Sat night", ...
  day: string; // "Sun"
  date: string; // "Jun 15"
  rating: Rating;
  dur: number;
  bed: number;
  wake: number;
  eff: number;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse the API "YYYY-MM-DD" as a local date (no timezone shift). */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Efficiency → coarse rating (we don't get a Google sleep score). */
function ratingFor(eff: number): Rating {
  if (eff >= 92) return 'Great';
  if (eff >= 87) return 'Good';
  return 'Fair';
}

/** Adapt API nights (newest first) into view models with relative labels. */
export function toNightViews(nights: SleepNight[]): NightView[] {
  return nights.map((n, i) => {
    const d = parseDate(n.date);
    const rel = i === 0 ? 'Last night' : `${DOW[d.getDay()]} night`;
    return {
      raw: n,
      rel,
      day: DOW[d.getDay()],
      date: `${MON[d.getMonth()]} ${d.getDate()}`,
      rating: ratingFor(n.efficiency),
      dur: n.durationMinutes,
      bed: n.onsetClock,
      wake: n.wakeClock,
      eff: n.efficiency,
    };
  });
}
