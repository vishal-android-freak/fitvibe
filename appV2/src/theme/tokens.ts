/**
 * FitVibe design tokens — ported from the design handoff token contract.
 * Dark-first. The active accent is **aurora** (violet + cyan, AI-forward),
 * matching `data-accent="aurora"` in the prototypes. Metric hues color every
 * chart/ring; the AI gradient is reserved for AI / insight moments only.
 */

/* ---- Metric hues (every chart/ring is colored by its metric) ---- */
export const hue = {
  move: '#4ADE80', // move / steps / active energy
  steps: '#4ADE80',
  recovery: '#4ADE80', // HRV / recovery / readiness
  heart: '#FF5C7A',
  sleep: '#888CF9',
  oxygen: '#38E0D8', // SpO2 / respiratory
  energy: '#FFB020',
  hydration: '#4380FF',
  nutrition: '#FF844C',
  mind: '#C792EA', // HRV
  sky: '#60A5FA',
} as const;

export type MetricHue = keyof typeof hue;

/* ---- Surfaces (dark) ---- */
export const surface = {
  bgApp: '#0A0E1A',
  bgSunken: '#070B14',
  card: '#131A2B',
  raised: '#1A2236',
  overlay: '#0E1424',
  input: '#0E1424',
  inset: '#070B14',
  hover: '#232D45',
} as const;

/* ---- Text ---- */
export const text = {
  primary: '#F8FAFC', // strong
  secondary: '#94A3B8', // body
  tertiary: '#64748B', // faint
  muted: '#475569',
  onAccent: '#1a0b33', // aurora on-accent
} as const;

/* ---- Borders / dividers (low-opacity hairlines) ---- */
export const border = {
  subtle: 'rgba(255,255,255,0.07)',
  default: 'rgba(255,255,255,0.11)',
  strong: 'rgba(255,255,255,0.18)',
  accent: 'rgba(167,139,250,0.45)',
} as const;

/* ---- Accent (aurora active) ---- */
export const accent = {
  base: '#A78BFA',
  hover: '#C4B5FD',
  press: '#8B5CF6',
  secondary: '#22D3EE',
  soft: 'rgba(167,139,250,0.15)',
  softBlue: 'rgba(34,211,238,0.14)',
} as const;

/* ---- AI / insight signature gradient (aurora) ---- */
export const ai = {
  /** gradient stops + diagonal angle (120deg) — feed to expo-linear-gradient/svg */
  from: '#A78BFA',
  mid: '#22D3EE',
  to: '#67E8F9',
  gradient: ['#A78BFA', '#22D3EE', '#67E8F9'] as const,
  /** start/end approximating a 120deg CSS linear-gradient */
  gradientStart: { x: 0, y: 0 },
  gradientEnd: { x: 1, y: 0.6 },
  onGradient: '#05131F', // dark text/icon laid over the AI gradient
  soft: 'rgba(167,139,250,0.12)',
} as const;

/* ---- Status ---- */
export const status = {
  success: '#4ADE80',
  positive: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F43F5E',
  info: '#60A5FA',
} as const;

/* ---- Glass (sticky/floating chrome only — don't blur static cards) ---- */
export const glass = {
  card: 'rgba(19,26,43,0.66)',
  bar: 'rgba(10,14,26,0.72)',
  border: 'rgba(255,255,255,0.12)',
  blur: 16,
} as const;

/* ---- Typography ----
 * Display + sans + big numerals: Sora (tabular figures). Mono: JetBrains Mono.
 * Font family keys map to the names registered in the root layout. */
export const font = {
  display: 'Sora_700Bold',
  displaySemibold: 'Sora_600SemiBold',
  sans: 'Sora_500Medium',
  sansRegular: 'Sora_400Regular',
  sansSemibold: 'Sora_600SemiBold',
  sansBold: 'Sora_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;

export const fontSize = {
  '2xs': 11,
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 38,
  '4xl': 48,
  '5xl': 60,
  '6xl': 76,
} as const;

export const lineHeight = {
  none: 1,
  tight: 1.12,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const tracking = {
  tight: -0.36, // ~ -0.015em on display sizes (RN uses px letterSpacing)
  caps: 1.6, // ~ 0.14em tracked-out uppercase eyebrows
  wide: 0.4,
} as const;

/* ---- Spacing (4px grid) ---- */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/* ---- Radii ---- */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28, // cards
  '2xl': 36,
  pill: 999,
} as const;

/* ---- Control sizing ---- */
export const control = {
  hitTarget: 44, // min touch target
  sm: 36,
  md: 44,
  lg: 52,
} as const;

/* ---- Layout ---- */
export const layout = {
  gutter: 20,
  maxContent: 440,
} as const;

/* ---- Elevation (soft dark shadows) — RN shadow objects ---- */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
} as const;

/* ---- Glow (alive/important only — rings, accent buttons, AI cards) ---- */
export const glow = {
  ai: {
    shadowColor: accent.base,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  green: {
    shadowColor: hue.move,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  accent: {
    shadowColor: accent.base,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

/* ---- Motion ---- */
export const motion = {
  durFast: 140,
  durBase: 220,
  durSlow: 380,
  // Reanimated Easing bezier control points (see src/theme/easing.ts).
  easeOut: [0.22, 1, 0.36, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  easeSpring: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const ringTrack = 'rgba(255,255,255,0.08)';

/** Resolve a metric-hue token name to a color; pass-through any other CSS color. */
export function resolveHue(h: MetricHue | string): string {
  return (hue as Record<string, string>)[h] ?? h;
}
