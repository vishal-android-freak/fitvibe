---
name: vaidya-ui-blocks
description: How to call the emit_block and emit_canvas generative-UI tools — the exact block kinds, their JSON shapes, the canvas draw-op vocabulary, and which block to pick. Load this BEFORE emitting any UI block so you get the shape right on the first try.
---

# Vaidya generative-UI blocks

You render UI in a response by calling `emit_block` (one block per call) and, only
as a last resort, `emit_canvas`. The app renders each block with its own design-
system component. Get the shape right the first time using this reference — every
field name and type matters (the tool validates and rejects malformed blocks).

## How to call

- `emit_block({ block: { kind: "...", ... } })` — pass ONE block object with a
  `kind` field and that kind's fields. (A JSON-stringified object is tolerated,
  but a real object is preferred.)
- `emit_canvas({ width, height, background?, ops: [...] })` — only when no block
  kind fits.
- Emit blocks in the order you want them shown. Interleave with prose as needed.
- NEVER fabricate the values you put in a block — use numbers from tool results.

## Pick the right block

- The three insight surfaces have a dedicated composite block — ALWAYS use it:
  - Today headline → `today_headline`
  - Per-sleep insight → `sleep_insight` (+ a `hypnogram` for the stage timeline)
  - Day report → start with `day_summary`, then supporting evidence blocks
- Show a metric/trend with the matching evidence block:
  - one number → `stat_tile`; several → `stat_tile_grid`
  - a trend line → `sparkline`; daily/weekly bars → `bars`
  - a 0–1 progress value → `ring`; a streak → `streak_dots`
  - sleep stages → `hypnogram`; readiness → `readiness_card`
  - recovery vitals row → `recovery_signals`; macros → `micro_bars`
  - a small label/metric chip → `badge`
- `emit_canvas` is the LAST RESORT — only for a visual no block above can express.
  Do not use it for sleep narratives, hypnograms, or standard charts.

## Colors (hue)

`hue` fields take a hex (`"#888CF9"`) or a metric token name the app resolves:
`move`/`steps`/`recovery` (green), `heart` (red), `sleep` (indigo), `mind` (lilac,
HRV), `oxygen` (teal), `energy` (amber), `hydration` (blue), `nutrition` (orange).
Prefer the token that matches the metric (sleep→`sleep`, HR→`heart`, HRV→`mind`).

## Rich text (Seg)

Composite block bodies are `Seg[]`: `[{ "t": "You slept ", "b": false }, { "t":
"7h 57m", "b": true }, { "t": " — solid.", "b": false }]`. Bold (`b:true`) the
metrics so they stand out.

## Full reference

`references/blocks.md` has every block kind with a complete JSON example, plus the
full canvas draw-op vocabulary. Consult it for exact field names before emitting
anything beyond the simplest block.
