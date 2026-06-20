/**
 * GenerativeBlock — the app-side mirror of the Vaidya agent's block contract
 * (vaidya-service/src/tools/blocks.ts). The agent emits these; <BlockRenderer>
 * renders each via the matching component. Keep in sync with the service schema.
 */

import type { SleepStage, SleepSegment, StatTileSpec, ReadinessFactor } from '@/components';

/** Rich-text segment (bold the metrics). Mirrors the app's Seg. */
export interface Seg {
  t: string;
  b?: boolean;
}

export interface BadgeSpec {
  text: string;
  hue?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'info' | 'accent';
}

// --- Tier 1: composite insight blocks ---
export interface TodayHeadlineBlock {
  kind: 'today_headline';
  title: string;
  body: string;
  badges?: BadgeSpec[];
}
export interface SleepInsightBlock {
  kind: 'sleep_insight';
  title: string;
  body: Seg[];
  badges?: BadgeSpec[];
}
export interface DaySummaryBlock {
  kind: 'day_summary';
  headline: string;
  body: Seg[];
}

// --- Tier 2: primitive evidence blocks ---
export interface HypnogramBlock {
  kind: 'hypnogram';
  segments: SleepSegment[]; // [stage, minutes][]
  onsetClock?: number;
  showBreakdown?: boolean;
}
export interface SparklineBlock {
  kind: 'sparkline';
  data: number[];
  hue?: string;
  fill?: boolean;
  dot?: boolean;
}
export interface BarsBlock {
  kind: 'bars';
  data: number[];
  labels?: string[];
  hue?: string;
  goal?: number;
  tooltips?: string[];
}
export interface RingBlock {
  kind: 'ring';
  value: number; // 0..1
  hue: string;
  center: string;
}
export interface StatTileBlock extends StatTileSpec {
  kind: 'stat_tile';
}
export interface StatTileGridBlock {
  kind: 'stat_tile_grid';
  tiles: StatTileSpec[];
  columns?: number;
}
export interface ReadinessCardBlock {
  kind: 'readiness_card';
  score: number;
  caption?: string;
  hue?: string;
  factors: ReadinessFactor[];
}
export interface RecoverySignalSpec {
  label: string;
  value: string;
  unit: string;
  hue: string;
  week: number[];
  status?: string;
}
export interface RecoverySignalsBlock {
  kind: 'recovery_signals';
  signals: RecoverySignalSpec[];
  labels?: string[];
}
export interface StreakDotsBlock {
  kind: 'streak_dots';
  filled: number;
  total: number;
  hue: string;
}
export interface MicroSpec {
  label: string;
  value: number;
  goal: number;
  unit: string;
  hue: string;
}
export interface MicroBarsBlock {
  kind: 'micro_bars';
  items: MicroSpec[];
}
export interface BadgeBlock {
  kind: 'badge';
  text: string;
  hue?: string;
  tone?: BadgeSpec['tone'];
}

// --- canvas (Skia) ---
export type DrawOp =
  | { op: 'rect'; x: number; y: number; w: number; h: number; rx?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth?: number; dash?: number[]; opacity?: number }
  | { op: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: 'poly'; points: [number, number][]; fill?: string; stroke?: string; strokeWidth?: number; closed?: boolean; opacity?: number }
  | { op: 'text'; x: number; y: number; text: string; size?: number; color?: string; weight?: 'regular' | 'medium' | 'semibold' | 'bold'; align?: 'left' | 'center' | 'right'; font?: 'display' | 'sans' | 'mono'; opacity?: number }
  | { op: 'image'; src: string; x: number; y: number; w: number; h: number; rx?: number; opacity?: number; fit?: 'cover' | 'contain' | 'fill' }
  | { op: 'lineargradient'; id: string; x1: number; y1: number; x2: number; y2: number; stops: { offset: number; color: string; opacity?: number }[] }
  | { op: 'group'; transform?: { translate?: [number, number]; rotate?: number; scale?: number | [number, number] }; ops: DrawOp[] };

export interface CanvasBlockSpec {
  kind: 'canvas';
  width: number;
  height: number;
  background?: string;
  ops: DrawOp[];
}

export type GenerativeBlock =
  | TodayHeadlineBlock
  | SleepInsightBlock
  | DaySummaryBlock
  | HypnogramBlock
  | SparklineBlock
  | BarsBlock
  | RingBlock
  | StatTileBlock
  | StatTileGridBlock
  | ReadinessCardBlock
  | RecoverySignalsBlock
  | StreakDotsBlock
  | MicroBarsBlock
  | BadgeBlock
  | CanvasBlockSpec;
