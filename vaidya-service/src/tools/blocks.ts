/**
 * GenerativeBlock — the contract between the Vaidya agent and the app.
 *
 * The agent emits these via emit_block / emit_canvas; the app's <BlockRenderer>
 * switches on `kind` and renders the matching component. Each variant's props
 * mirror an existing app component (see appV2/src/components). Keep this in sync
 * with the app's mirrored TS type.
 *
 * Tiers:
 *   - composite "insight" blocks (today_headline / sleep_insight / day_summary)
 *     wrap InsightCard for the three insight surfaces.
 *   - primitive "evidence" blocks map 1:1 to chart/data components.
 *   - canvas is the Skia escape hatch (full draw-op vocabulary).
 *
 * `hue` fields accept a raw hex string OR a metric-hue token name (the app
 * resolves token names via resolveHue()).
 */

import { z } from "zod";

// --- shared ---------------------------------------------------------------

/** Rich-text segment: text, optionally bold (used to make metrics stand out). */
const Seg = z.object({ t: z.string(), b: z.boolean().optional() });

/** Color: raw hex (#RRGGBB) or a metric-hue token name (e.g. "sleep","heart"). */
const Hue = z.string();

const BadgeSpec = z.object({
  text: z.string(),
  hue: Hue.optional(),
  tone: z
    .enum(["neutral", "positive", "warning", "danger", "info", "accent"])
    .optional(),
});

const SleepStage = z.enum(["Deep", "REM", "Light", "Awake"]);

// --- Tier 1: composite insight blocks -------------------------------------

const TodayHeadline = z.object({
  kind: z.literal("today_headline"),
  title: z.string(),
  body: z.string(),
  badges: z.array(BadgeSpec).max(2).optional(),
});

const SleepInsight = z.object({
  kind: z.literal("sleep_insight"),
  title: z.string(),
  body: z.array(Seg),
  badges: z.array(BadgeSpec).max(3).optional(),
});

const DaySummary = z.object({
  kind: z.literal("day_summary"),
  headline: z.string(),
  body: z.array(Seg),
});

// A full insight-feed card (the Insights tab): a typed, categorized finding with
// a headline, rich-text body citing real numbers, an inline viz, and provenance.
const InsightViz = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("spark"), data: z.array(z.number()), hue: Hue }),
  z.object({ kind: z.literal("bars"), data: z.array(z.number()), labels: z.array(z.string()), hue: Hue }),
  z.object({ kind: z.literal("streak"), filled: z.number().int(), total: z.number().int(), hue: Hue }),
  z.object({ kind: z.literal("ring"), value: z.number().min(0).max(1), hue: Hue, center: z.string() }),
]);
const ProvItem = z.object({ icon: z.string(), label: z.string(), hue: Hue });

const InsightCard = z.object({
  kind: z.literal("insight_card"),
  insightType: z.enum(["trend", "correlation", "flag", "achievement", "tip", "comparison"]),
  category: z.enum(["recovery", "sleep", "heart", "activity", "nutrition"]),
  headline: z.string(),
  body: z.array(Seg),
  viz: InsightViz.optional(),
  provenance: z.array(ProvItem).optional(), // which metrics this is derived from
  seed: z.string().optional(), // an "ask about this" follow-up question
});

// --- Tier 2: primitive evidence blocks ------------------------------------

const Hypnogram = z.object({
  kind: z.literal("hypnogram"),
  // [stage, minutes] tuples, in order.
  segments: z.array(z.tuple([SleepStage, z.number()])),
  onsetClock: z.number().optional(), // minutes since local midnight
  showBreakdown: z.boolean().optional(),
});

const Sparkline = z.object({
  kind: z.literal("sparkline"),
  data: z.array(z.number()),
  hue: Hue.optional(),
  fill: z.boolean().optional(),
  dot: z.boolean().optional(),
});

const Bars = z.object({
  kind: z.literal("bars"),
  data: z.array(z.number()),
  labels: z.array(z.string()).optional(),
  hue: Hue.optional(),
  goal: z.number().optional(),
  tooltips: z.array(z.string()).optional(),
});

const Ring = z.object({
  kind: z.literal("ring"),
  value: z.number().min(0).max(1),
  hue: Hue,
  center: z.string(),
});

const StatTileSpec = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  hue: Hue.optional(),
  delta: z.string().optional(),
  deltaDir: z.enum(["up", "down"]).optional(),
  spark: z.array(z.number()).optional(),
  goal: z.string().optional(),
});

const StatTile = StatTileSpec.extend({ kind: z.literal("stat_tile") });

const StatTileGrid = z.object({
  kind: z.literal("stat_tile_grid"),
  tiles: z.array(StatTileSpec),
  columns: z.number().int().min(1).max(4).optional(),
});

const ReadinessFactor = z.object({
  icon: z.string(),
  hue: Hue,
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  good: z.boolean().optional(),
});

const ReadinessCard = z.object({
  kind: z.literal("readiness_card"),
  score: z.number().min(0).max(100),
  caption: z.string().optional(),
  hue: Hue.optional(),
  factors: z.array(ReadinessFactor),
});

const RecoverySignal = z.object({
  label: z.string(),
  value: z.string(), // the app's RecoverySignal.value is a string
  unit: z.string(),
  hue: Hue,
  week: z.array(z.number()),
  status: z.string().optional(),
});

const RecoverySignals = z.object({
  kind: z.literal("recovery_signals"),
  signals: z.array(RecoverySignal),
  labels: z.array(z.string()).optional(),
});

const StreakDots = z.object({
  kind: z.literal("streak_dots"),
  filled: z.number().int().min(0),
  total: z.number().int().min(1),
  hue: Hue,
});

const Micro = z.object({
  label: z.string(),
  value: z.number(),
  goal: z.number(),
  unit: z.string(),
  hue: Hue,
});

const MicroBars = z.object({
  kind: z.literal("micro_bars"),
  items: z.array(Micro),
});

const BadgeBlock = z.object({
  kind: z.literal("badge"),
  text: z.string(),
  hue: Hue.optional(),
  tone: BadgeSpec.shape.tone,
});

// --- canvas escape hatch (Skia) -------------------------------------------

// Draw ops are intentionally maximal. Colors accept hex or token names; the
// renderer defaults unset colors to the app theme. `image` takes a data: URI or
// https url (rendered into the given box). The `group` op nests ops, so the type
// is recursive — declare an explicit input type for the zod lazy schema.
type DrawOpInput =
  | { op: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth?: number; dash?: number[]; opacity?: number }
  | { op: "path"; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { op: "poly"; points: [number, number][]; fill?: string; stroke?: string; strokeWidth?: number; closed?: boolean; opacity?: number }
  | { op: "text"; x: number; y: number; text: string; size?: number; color?: string; weight?: "regular" | "medium" | "semibold" | "bold"; align?: "left" | "center" | "right"; font?: "display" | "sans" | "mono"; opacity?: number }
  | { op: "image"; src: string; x: number; y: number; w: number; h: number; rx?: number; opacity?: number; fit?: "cover" | "contain" | "fill" }
  | { op: "lineargradient"; id: string; x1: number; y1: number; x2: number; y2: number; stops: { offset: number; color: string; opacity?: number }[] }
  | { op: "group"; transform?: { translate?: [number, number]; rotate?: number; scale?: number | [number, number] }; ops: DrawOpInput[] };

const DrawOpSchema: z.ZodType<DrawOpInput> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({
      op: z.literal("rect"),
      x: z.number(), y: z.number(), w: z.number(), h: z.number(),
      rx: z.number().optional(),
      fill: Hue.optional(), stroke: Hue.optional(),
      strokeWidth: z.number().optional(), opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("circle"),
      cx: z.number(), cy: z.number(), r: z.number(),
      fill: Hue.optional(), stroke: Hue.optional(),
      strokeWidth: z.number().optional(), opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("line"),
      x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(),
      stroke: Hue, strokeWidth: z.number().optional(),
      dash: z.array(z.number()).optional(), opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("path"),
      d: z.string(), // SVG path data
      fill: Hue.optional(), stroke: Hue.optional(),
      strokeWidth: z.number().optional(), opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("poly"),
      points: z.array(z.tuple([z.number(), z.number()])),
      fill: Hue.optional(), stroke: Hue.optional(),
      strokeWidth: z.number().optional(), closed: z.boolean().optional(),
      opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("text"),
      x: z.number(), y: z.number(), text: z.string(),
      size: z.number().optional(), color: Hue.optional(),
      weight: z.enum(["regular", "medium", "semibold", "bold"]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      font: z.enum(["display", "sans", "mono"]).optional(),
      opacity: z.number().optional(),
    }),
    z.object({
      op: z.literal("image"),
      src: z.string(), // data: URI or https url
      x: z.number(), y: z.number(), w: z.number(), h: z.number(),
      rx: z.number().optional(), opacity: z.number().optional(),
      fit: z.enum(["cover", "contain", "fill"]).optional(),
    }),
    z.object({
      op: z.literal("lineargradient"),
      id: z.string(),
      x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(),
      stops: z.array(
        z.object({
          offset: z.number(),
          color: Hue,
          opacity: z.number().optional(),
        }),
      ),
    }),
    z.object({
      op: z.literal("group"),
      transform: z
        .object({
          translate: z.tuple([z.number(), z.number()]).optional(),
          rotate: z.number().optional(),
          scale: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
        })
        .optional(),
      ops: z.array(DrawOpSchema),
    }),
  ]),
);

const Canvas = z.object({
  kind: z.literal("canvas"),
  width: z.number(),
  height: z.number(),
  background: Hue.optional(),
  ops: z.array(DrawOpSchema),
});

// --- the union ------------------------------------------------------------

export const GenerativeBlock = z.discriminatedUnion("kind", [
  TodayHeadline,
  SleepInsight,
  DaySummary,
  InsightCard,
  Hypnogram,
  Sparkline,
  Bars,
  Ring,
  StatTile,
  StatTileGrid,
  ReadinessCard,
  RecoverySignals,
  StreakDots,
  MicroBars,
  BadgeBlock,
  Canvas,
]);

export type GenerativeBlock = z.infer<typeof GenerativeBlock>;

/** All valid block kinds (for tool descriptions / the app renderer). */
export const BLOCK_KINDS = GenerativeBlock.options.map(
  (o) => o.shape.kind.value,
) as string[];
