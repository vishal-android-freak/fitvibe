/** Canned conversational replies keyed by the user's question (prototype mock).
 *  In production these come from the LLM service. */
export const CANNED: Record<string, string> = {
  'Still a bit warm':
    'Thanks for the heads-up. A low-grade warmth two days in is worth watching — keep fluids high and skip hard training today. If it tops 38°C or lasts past tomorrow, check in with a clinician. Want a gentle mobility session instead?',
  'Feeling clearer':
    "Good to hear. Your resting heart rate agrees — it's settled back to 54 bpm. You're clear for a moderate effort; just keep it conversational while the cough fully clears.",
  'Cough is worse':
    "Sorry to hear it. When symptoms are climbing, rest beats training every time. I'd take today fully off and prioritize sleep and 3 L of water. Shall I pause your training plan for 48 hours?",
  'Plan my week':
    "Here's a recovery-first week: easy 30 min today, rest tomorrow, then a tempo run Thursday once your cough clears. I'll keep Saturday open for a longer effort if you're feeling good.",
  "How's my VO₂ max?":
    "It's nudged from 42 to 44 ml/kg over the last month — steady, healthy progress. Your easy-run pace dropped ~15 s/km at the same heart rate, which is the clearest sign your aerobic engine is growing.",
  'Why keep it easy?':
    'Your last two sessions were hard and your HRV, while high, dipped slightly overnight. An easy day lets the adaptation from this run actually stick — pushing again now would just add fatigue without the fitness payoff.',
  "What's driving my recovery improvement?":
    'Two things stand out: your resting heart rate fell 3 bpm and HRV rose 12% over the week — classic signs your training load and recovery are well matched. Five nights of 7h+ sleep are doing most of the work.',
  'How are late meals affecting my deep sleep?':
    'On the four nights you ate after 9 PM, deep sleep averaged 22% lower than on early-dinner nights. Late digestion keeps your core temperature up, which suppresses deep sleep early in the night. Try finishing dinner about 3 hours before bed.',
  'Why was my resting heart rate elevated Thursday?':
    "Thursday's resting HR was 6 bpm above your baseline. It lines up with a late lights-out (12:14 AM) and lower HRV — your body was still recovering. It returned to normal by Saturday, so nothing to worry about.",
  'Should I train hard today?':
    'Yes — your readiness is 86, HRV is 62 ms, and your resting HR is fully recovered. Recent load has been moderate, so your body can absorb a harder session. Keep it earlier in the day to protect tonight’s sleep.',
  'Why is my VO₂ max improving?':
    'Your VO₂ max ticked from 42 to 44 ml/kg this month. The driver is your steady zone 2 running — holding the same pace at a lower heart rate means your aerobic engine is getting more efficient.',
  'Compare my activity to last week':
    "You're up 18% in active zone minutes (186 vs 158) and your daily step average rose to 8,240. You also hit your move goal 6 of 7 days versus 4 last week — a strong, consistent week.",
  'Why does my hydration drop on weekends?':
    'Your weekday hydration averages 2.3 L, but Saturday and Sunday fall to about 1.4 L — likely a broken routine away from your desk. A couple of weekend reminders should close the gap.',
  "How's my move streak going?":
    "You've closed your move ring 6 days running — your longest streak this month. One more today makes it a full week.",
};

export const DEFAULT_REPLY =
  "Got it. I'll factor that in. Based on your recent recovery, keeping today light and well-hydrated is the safe call — want me to adjust your plan?";

export const FOLLOWUPS = ['Plan my week', "How's my recovery?", 'Compare to last week'];

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}
