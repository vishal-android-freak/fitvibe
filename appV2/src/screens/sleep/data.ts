import { accent, hue, status } from '@/theme';
import type { SleepNight } from '@/data/sleep';

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

/**
 * Signed difference between two clock times (minutes since midnight), wrapped to
 * the nearest direction on a 24h clock so e.g. 12:54 AM vs an 11:00 PM target
 * reads "+1h 54m" (≈2h late), not "−1326m". Result is in [−720, +720].
 */
export function clockDeltaMinutes(actual: number, target: number): number {
  let d = (((actual - target) % 1440) + 1440) % 1440; // 0..1439
  if (d > 720) d -= 1440; // take the shorter signed direction
  return d;
}

/** Human signed delta vs a target clock time, e.g. "+1h 54m" / "−25m" / "on time". */
export function delta(actual: number, target: number): string {
  const d = clockDeltaMinutes(actual, target);
  if (d === 0) return 'on time';
  const sign = d > 0 ? '+' : '−';
  const abs = Math.abs(d);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h > 0 ? `${sign}${h}h ${String(m).padStart(2, '0')}m` : `${sign}${m}m`;
}

export type Rating = 'Great' | 'Good' | 'Fair';

export function ratingHue(r: Rating): string {
  return r === 'Great' ? hue.move : r === 'Good' ? accent.base : status.warning;
}

/** Sleep-score band label → gauge hue (Excellent/Good green-ish, Fair amber, Poor red). */
export function scoreBandHue(label: string): string {
  switch (label) {
    case 'Excellent':
      return hue.move;
    case 'Good':
      return accent.base;
    case 'Fair':
      return status.warning;
    default:
      return status.danger;
  }
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
