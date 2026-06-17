import type { Seg } from '@/screens/insights/data';

export type AnalysisId = 'sleep' | 'run';
export type GenKind = 'sleep' | 'run';

export interface Analysis {
  time: string;
  headline: string;
  body: Seg[];
  bullets: Seg[][];
  question: string;
  replies: string[];
  gen: GenKind;
}

export const ANALYSES: Record<AnalysisId, Analysis> = {
  sleep: {
    time: '6:52 AM',
    headline: 'Your recovery is strong, but your bedtime is drifting later',
    body: [
      { t: 'You slept ' },
      { t: '7h 12m', b: true },
      { t: ' with ' },
      { t: 'deep sleep up 18%', b: true },
      { t: ' versus last week, and your ' },
      { t: 'HRV hit 62 ms', b: true },
      { t: ' — the highest in two weeks. The catch: a late evening pushed lights-out to ' },
      { t: '12:10 AM', b: true },
      { t: ', trimming your final REM cycle to just ' },
      { t: '29 minutes', b: true },
      { t: '.' },
    ],
    bullets: [
      [{ t: 'Aim for lights-out by ' }, { t: '11:15 PM', b: true }, { t: ' tonight to win back the REM you missed.' }],
      [{ t: 'Your resting heart rate is back in range, so a moderate session today is fine — just skip intervals while your cough lingers.' }],
      [{ t: 'Keep hydration near your ' }, { t: '3 L', b: true }, { t: ' goal to help the meds clear; you ran ~0.9 L short over the weekend.' }],
    ],
    question: 'Is that warmth in your forehead still there this morning, or has it cleared?',
    replies: ['Still a bit warm', 'Feeling clearer', 'Cough is worse'],
    gen: 'sleep',
  },
  run: {
    time: '7:38 AM',
    headline: 'Solid zone 2 run — your aerobic base is building',
    body: [
      { t: 'Your ' },
      { t: '5.2 km', b: true },
      { t: ' run held ' },
      { t: 'zone 2', b: true },
      { t: ' for 24 of 28 minutes, with heart rate drifting up just ' },
      { t: '4 bpm', b: true },
      { t: ' at a steady ' },
      { t: '5:19 /km', b: true },
      { t: ' pace. That’s textbook aerobic work, and it lines up with your ' },
      { t: 'VO₂ max ticking to 44', b: true },
      { t: '.' },
    ],
    bullets: [
      [{ t: 'Keep tomorrow easy or rest — back-to-back hard days blunt the adaptation.' }],
      [{ t: 'Your cough is still hanging on, so hold off on the trainer until it clears.' }],
      [{ t: 'Refuel with protein in the next hour to speed recovery.' }],
    ],
    question: "Want me to plan this week's runs around your recovery?",
    replies: ['Plan my week', "How's my VO₂ max?", 'Why keep it easy?'],
    gen: 'run',
  },
};
