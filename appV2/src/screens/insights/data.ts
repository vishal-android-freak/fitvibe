import { accent, hue } from '@/theme';
import type { IconName } from '@/components';

/** A body text segment; `bold` marks a metric to emphasize. */
export interface Seg {
  t: string;
  b?: boolean;
}

export type CatId = 'all' | 'recovery' | 'sleep' | 'heart' | 'activity' | 'nutrition';
export type TypeId = 'trend' | 'correlation' | 'flag' | 'achievement' | 'tip' | 'comparison';
export type GroupId = 'new' | 'week' | 'earlier';

export const INSIGHT_CATS: { id: CatId; label: string; hue: string }[] = [
  { id: 'all', label: 'All', hue: accent.base },
  { id: 'recovery', label: 'Recovery', hue: accent.base },
  { id: 'sleep', label: 'Sleep', hue: hue.sleep },
  { id: 'heart', label: 'Heart', hue: hue.heart },
  { id: 'activity', label: 'Activity', hue: hue.move },
  { id: 'nutrition', label: 'Nutrition', hue: hue.nutrition },
];

export const CAT_HUE: Record<CatId, string> = Object.fromEntries(INSIGHT_CATS.map((c) => [c.id, c.hue])) as Record<CatId, string>;

export const TYPE_META: Record<TypeId, { label: string; icon: IconName }> = {
  trend: { label: 'Trend', icon: 'trending-up' },
  correlation: { label: 'Correlation', icon: 'git-compare-arrows' },
  flag: { label: 'Flag', icon: 'alert-circle' },
  achievement: { label: 'Achievement', icon: 'award' },
  tip: { label: 'Recommendation', icon: 'lightbulb' },
  comparison: { label: 'Comparison', icon: 'chart-no-axes-column' },
};

/** Provenance metric definitions — the data points an insight derives from. */
const M = {
  rhr: { icon: 'heart', label: 'Resting HR', hue: hue.heart },
  hrv: { icon: 'activity', label: 'HRV', hue: hue.mind },
  deep: { icon: 'moon', label: 'Deep sleep', hue: hue.sleep },
  sleep: { icon: 'moon', label: 'Sleep', hue: hue.sleep },
  meals: { icon: 'utensils', label: 'Meal times', hue: hue.nutrition },
  steps: { icon: 'footprints', label: 'Steps', hue: hue.move },
  energy: { icon: 'flame', label: 'Active energy', hue: hue.energy },
  zone: { icon: 'timer', label: 'Zone minutes', hue: hue.heart },
  vo2: { icon: 'gauge', label: 'VO₂ max', hue: hue.move },
  pace: { icon: 'footprints', label: 'Pace', hue: hue.move },
  hydration: { icon: 'glass-water', label: 'Hydration', hue: hue.hydration },
  readiness: { icon: 'battery-charging', label: 'Readiness', hue: accent.base },
} satisfies Record<string, { icon: IconName; label: string; hue: string }>;

export type ProvKey = keyof typeof M;
export interface ProvItem {
  icon: IconName;
  label: string;
  hue: string;
}
export const prov = (...keys: ProvKey[]): ProvItem[] => keys.map((k) => M[k]);

export type Viz =
  | { kind: 'spark'; data: number[]; hue: string }
  | { kind: 'bars'; data: number[]; labels: string[]; hue: string }
  | { kind: 'streak'; filled: number; total: number; hue: string }
  | { kind: 'ring'; value: number; hue: string; center: string };

export interface Insight {
  id: string;
  group: GroupId;
  isNew?: boolean;
  cat: CatId;
  type: TypeId;
  time: string;
  headline: string;
  body: Seg[];
  viz: Viz;
  prov: ProvItem[];
  seed: string;
}

export const SPOTLIGHT = {
  title: 'Your recovery is trending up',
  body: [
    { t: 'Over the last 7 days your ' },
    { t: 'resting HR fell 3 bpm', b: true },
    { t: ' and ' },
    { t: 'HRV rose 12%', b: true },
    { t: ' — your body is adapting well to your training load. Five nights of 7h+ sleep are doing the heavy lifting.' },
  ] as Seg[],
  prov: prov('hrv', 'rhr', 'deep'),
  source: 'Fitbit Charge 6 · synced 4 min ago',
  seed: "What's driving my recovery improvement?",
};

export const INSIGHTS: Insight[] = [
  {
    id: 'late-meals',
    group: 'new',
    isNew: true,
    cat: 'sleep',
    type: 'correlation',
    time: 'Today',
    headline: 'Late dinners are costing you deep sleep',
    body: [
      { t: 'On the ' },
      { t: '4 nights you ate after 9 PM', b: true },
      { t: ', deep sleep averaged ' },
      { t: '22% lower', b: true },
      { t: '. Late digestion keeps core temperature up, blunting deep sleep early in the night.' },
    ],
    viz: { kind: 'bars', data: [78, 61], labels: ['Early dinner', 'Late dinner'], hue: hue.sleep },
    prov: prov('meals', 'deep'),
    seed: 'How are late meals affecting my deep sleep?',
  },
  {
    id: 'rhr-spike',
    group: 'new',
    isNew: true,
    cat: 'heart',
    type: 'flag',
    time: 'Today',
    headline: 'Resting HR ran high on Thursday',
    body: [
      { t: "Thursday's resting HR was " },
      { t: '6 bpm above baseline', b: true },
      { t: ', lining up with a late night and lower HRV. It settled back by Saturday — nothing to worry about.' },
    ],
    viz: { kind: 'bars', data: [49, 50, 48, 56, 50, 48, 49], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hue: hue.heart },
    prov: prov('rhr', 'sleep', 'hrv'),
    seed: 'Why was my resting heart rate elevated Thursday?',
  },
  {
    id: 'move-streak',
    group: 'week',
    cat: 'activity',
    type: 'achievement',
    time: '2 days ago',
    headline: '6-day move streak — your longest this month',
    body: [
      { t: "You've closed your move ring " },
      { t: '6 days running', b: true },
      { t: ', averaging ' },
      { t: '8,240 steps', b: true },
      { t: ' a day. One more today makes it a full week.' },
    ],
    viz: { kind: 'streak', filled: 6, total: 7, hue: hue.move },
    prov: prov('energy', 'steps'),
    seed: "How's my move streak going?",
  },
  {
    id: 'train-hard',
    group: 'week',
    cat: 'recovery',
    type: 'tip',
    time: '2 days ago',
    headline: 'A good window for a hard session',
    body: [
      { t: 'Your ' },
      { t: 'readiness is 86', b: true },
      { t: ' with HRV at 62 ms and a fully recovered resting HR. Recent load has been moderate, so your body can absorb a harder effort today.' },
    ],
    viz: { kind: 'ring', value: 0.86, hue: accent.base, center: '86' },
    prov: prov('readiness', 'hrv', 'rhr'),
    seed: 'Should I train hard today?',
  },
  {
    id: 'vo2',
    group: 'week',
    cat: 'heart',
    type: 'trend',
    time: '4 days ago',
    headline: 'Your VO₂ max is climbing',
    body: [
      { t: 'Up from ' },
      { t: '42 to 44 ml/kg', b: true },
      { t: ' this month. You’re holding the same pace at a lower heart rate — your aerobic engine is getting more efficient.' },
    ],
    viz: { kind: 'spark', data: [42, 42, 43, 43, 43, 44, 44], hue: hue.move },
    prov: prov('vo2', 'pace', 'rhr'),
    seed: 'Why is my VO₂ max improving?',
  },
  {
    id: 'vs-last',
    group: 'week',
    cat: 'activity',
    type: 'comparison',
    time: '5 days ago',
    headline: 'More active than last week',
    body: [
      { t: 'Active zone minutes are ' },
      { t: 'up 18%', b: true },
      { t: ' (186 vs 158) and you hit your move goal ' },
      { t: '6 of 7 days', b: true },
      { t: ' versus 4 last week.' },
    ],
    viz: { kind: 'bars', data: [158, 186], labels: ['Last week', 'This week'], hue: hue.move },
    prov: prov('zone', 'steps'),
    seed: 'Compare my activity to last week',
  },
  {
    id: 'hydration',
    group: 'earlier',
    cat: 'nutrition',
    type: 'correlation',
    time: 'Last week',
    headline: 'Hydration dips on weekends',
    body: [
      { t: 'Weekdays you average ' },
      { t: '2.3 L', b: true },
      { t: ', but Saturday and Sunday drop to ' },
      { t: '~1.4 L', b: true },
      { t: ' — likely a broken routine away from your desk.' },
    ],
    viz: { kind: 'bars', data: [2.3, 2.4, 2.2, 2.3, 2.1, 1.4, 1.5], labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], hue: hue.hydration },
    prov: prov('hydration'),
    seed: 'Why does my hydration drop on weekends?',
  },
];

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'week', label: 'This week' },
  { id: 'earlier', label: 'Earlier' },
];
