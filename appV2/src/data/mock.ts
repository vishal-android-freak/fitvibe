/**
 * Mock health data — ported from the prototype's `app/data.jsx` `FV` object.
 * All numbers are fake. In production this comes from the Go backend's Google
 * Health sync; insights/chat from the LLM service (keep provenance per insight).
 */
import { hue } from '@/theme';

export interface MetricSeries {
  value: string | number;
  unit: string;
  delta: string;
  dir: 'up' | 'down';
  hue: string;
  icon: string;
  goal?: string;
  week: number[];
}

export const FV = {
  user: { name: 'Maya Okonkwo', first: 'Maya', device: 'Fitbit Charge 6' },
  today: {
    dateLabel: 'Monday, June 15',
    rings: { move: 0.82, exercise: 0.64, active: 0.47 },
    moveKcal: 612,
    moveGoal: 750,
    exerciseMin: 32,
    exerciseGoal: 50,
    activeHr: 9,
    activeGoal: 12,
  },
  metrics: {
    restingHr: { value: 54, unit: 'bpm', delta: '3 bpm', dir: 'down', hue: hue.heart, icon: 'heart', week: [58, 57, 57, 56, 55, 54, 54] },
    steps: { value: '8,240', unit: '', delta: '12%', dir: 'up', hue: hue.move, icon: 'footprints', goal: '/ 10k', week: [6200, 9100, 7400, 12030, 8800, 6400, 8240] },
    sleep: { value: '7h 12m', unit: '', delta: '24m', dir: 'up', hue: hue.sleep, icon: 'moon', week: [402, 418, 395, 470, 441, 388, 432] },
    spo2: { value: 97, unit: '%', delta: 'stable', dir: 'up', hue: hue.oxygen, icon: 'wind', week: [96, 97, 96, 97, 98, 97, 97] },
    energy: { value: '1,940', unit: 'kcal', delta: '6%', dir: 'up', hue: hue.energy, icon: 'flame', week: [1820, 2010, 1760, 2240, 1980, 1700, 1940] },
    hydration: { value: '1.6', unit: 'L', delta: '0.4 L', dir: 'down', hue: hue.hydration, icon: 'glass-water', goal: '/ 2.5L', week: [2.1, 2.4, 1.9, 2.6, 2.2, 1.4, 1.6] },
    hrv: { value: 62, unit: 'ms', delta: '12%', dir: 'up', hue: hue.mind, icon: 'activity', week: [52, 55, 54, 58, 60, 61, 62] },
    vo2: { value: 44, unit: 'ml/kg', delta: '1', dir: 'up', hue: hue.move, icon: 'gauge', week: [42, 42, 43, 43, 43, 44, 44] },
  } satisfies Record<string, MetricSeries>,
  sleepStages: [
    { type: 'Awake', min: 24, hue: hue.heart },
    { type: 'REM', min: 96, hue: hue.mind },
    { type: 'Light', min: 246, hue: hue.sleep },
    { type: 'Deep', min: 66, hue: hue.sky },
  ],
  workout: { type: 'Outdoor run', icon: 'footprints', dist: '5.2 km', dur: '27:41', pace: '5:19 /km', kcal: 384, hr: 156, hue: hue.move },
  insights: [
    {
      id: 1,
      title: 'Your recovery is trending up',
      icon: 'trending-up',
      body: 'Resting HR dropped 3 bpm and HRV rose 12% this week — your training load looks well matched to recovery. Consider a harder session tomorrow.',
      tags: [['HRV ▲12%', 'mind'], ['Resting HR ▼', 'heart']] as [string, string][],
    },
    {
      id: 2,
      title: 'Sleep is paying off',
      icon: 'moon',
      body: "You've hit 7+ hours four nights running. Deep sleep is up 18% vs last week, which tracks with your higher HRV.",
      tags: [['Deep ▲18%', 'sleep']] as [string, string][],
    },
    {
      id: 3,
      title: 'Hydration dipped on the weekend',
      icon: 'droplet',
      body: 'Saturday and Sunday came in under 1.6 L. On low-water days your resting HR ran ~4 bpm higher. Worth topping up earlier in the day.',
      tags: [['−0.9 L vs goal', 'hydration']] as [string, string][],
    },
  ],
  chat: [
    { role: 'user', text: 'How did I sleep last week?' },
    {
      role: 'assistant',
      text: 'You averaged 7h 12m across the week — Thursday was your best night at 7h 50m. Deep sleep is trending up, which lines up with your higher HRV.',
      gen: 'sleepWeek',
    },
    { role: 'user', text: 'Is my running fitness improving?' },
    {
      role: 'assistant',
      text: 'Yes — your VO₂ max nudged from 42 to 44 ml/kg over the last month and your easy-run pace dropped ~15 s/km at the same heart rate. Steady, healthy progress.',
      gen: 'vo2',
    },
  ] as ChatMsg[],
  prompts: ["How's my recovery?", 'Compare my sleep to last week', 'Why is my resting HR up?', "Plan tomorrow's workout"],
  devices: [
    { name: 'Fitbit Charge 6', status: 'Synced 4 min ago', battery: 72, icon: 'watch' },
    { name: 'Google Health', status: 'Connected', battery: null, icon: 'heart-pulse' },
  ],
  days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  gen?: 'sleepWeek' | 'vo2';
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
