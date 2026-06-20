# Generative-UI blocks — full reference

Every block is the `block` argument to `emit_block`, e.g.
`emit_block({ block: { "kind": "stat_tile", "label": "...", ... } })`.
All examples below show the inner block object.

`Seg` = `{ "t": string, "b"?: boolean }`. `hue` = hex or a metric token
(move, steps, recovery, heart, sleep, mind, oxygen, energy, hydration, nutrition).

---

## Composite insight blocks

### today_headline — Today-tab headline (text + ≤2 badges)
```json
{ "kind": "today_headline",
  "title": "Recovery's trending up",
  "body": "HRV is up 12% and resting HR down 3 bpm this week — a good day to push.",
  "badges": [ { "text": "HRV ▲12%", "hue": "mind" }, { "text": "RHR ▼3", "hue": "heart" } ] }
```
`title` ≤6 words; `body` ONE sentence; `badges` optional (0–2).

### sleep_insight — per-sleep narrative (rich text + ≤3 badges)
```json
{ "kind": "sleep_insight",
  "title": "A solid night",
  "body": [ { "t": "You slept " }, { "t": "7h 57m", "b": true },
            { "t": " with " }, { "t": "1h 37m deep", "b": true },
            { "t": " — above your 7-night average." } ],
  "badges": [ { "text": "Deep 20%", "hue": "sleep" }, { "text": "REM 25%", "hue": "mind" },
              { "text": "HRV 44ms", "hue": "heart" } ] }
```

### day_summary — day-report headline / section (rich text)
```json
{ "kind": "day_summary",
  "headline": "Strong recovery, light activity",
  "body": [ { "t": "Readiness " }, { "t": "78", "b": true },
            { "t": " on good sleep, but only " }, { "t": "4,200 steps", "b": true },
            { "t": " — room to move more tomorrow." } ] }
```

---

## Evidence blocks (map 1:1 to app charts)

### hypnogram — sleep stage timeline
`segments` is an array of `[stage, minutes]` tuples; stage ∈ `"Deep" | "REM" | "Light" | "Awake"` (exact casing).
```json
{ "kind": "hypnogram",
  "segments": [ ["Light", 20], ["Deep", 45], ["REM", 30], ["Light", 60], ["Awake", 8], ["REM", 40] ],
  "onsetClock": 1394, "showBreakdown": true }
```
`onsetClock` = minutes since local midnight (e.g. 1394 = 23:14). `showBreakdown` optional.

### sparkline — trend line
```json
{ "kind": "sparkline", "data": [62, 61, 63, 60, 58, 59, 57], "hue": "heart", "fill": true, "dot": true }
```

### bars — daily/weekly bars
```json
{ "kind": "bars", "data": [32, 41, 28, 55, 47, 60, 38],
  "labels": ["M","T","W","T","F","S","S"], "hue": "move", "goal": 45 }
```
`labels`, `goal`, `tooltips` (one string per bar) optional.

### ring — single 0–1 progress ring
```json
{ "kind": "ring", "value": 0.78, "hue": "recovery", "center": "78" }
```

### stat_tile — one metric tile
```json
{ "kind": "stat_tile", "label": "Resting HR", "value": 58, "unit": "bpm",
  "hue": "heart", "delta": "-3", "deltaDir": "down", "spark": [62,61,60,59,58] }
```
`unit`, `hue`, `delta`, `deltaDir` ("up"|"down"), `spark`, `goal` optional.

### stat_tile_grid — grid of tiles
```json
{ "kind": "stat_tile_grid", "columns": 2,
  "tiles": [
    { "label": "Steps", "value": "8,210", "hue": "move" },
    { "label": "HRV", "value": 44, "unit": "ms", "hue": "mind", "delta": "+5", "deltaDir": "up" } ] }
```

### readiness_card — readiness ring + factor tiles
```json
{ "kind": "readiness_card", "score": 78, "caption": "READY TO PUSH", "hue": "recovery",
  "factors": [
    { "icon": "heart-pulse", "hue": "mind", "label": "HRV", "value": "44 ms", "delta": "+5", "good": true },
    { "icon": "heart", "hue": "heart", "label": "RHR", "value": "58 bpm", "good": true },
    { "icon": "alarm-clock", "hue": "sleep", "label": "Sleep", "value": "7h 57m", "good": true } ] }
```

### recovery_signals — row of vital signal cards (value is a STRING; unit required)
```json
{ "kind": "recovery_signals",
  "signals": [
    { "label": "HRV", "value": "44", "unit": "ms", "hue": "mind", "week": [40,42,38,45,44,43,44] },
    { "label": "RHR", "value": "58", "unit": "bpm", "hue": "heart", "week": [60,61,59,58,58,57,58], "status": "good" } ],
  "labels": ["M","T","W","T","F","S","S"] }
```

### streak_dots — completion streak
```json
{ "kind": "streak_dots", "filled": 5, "total": 7, "hue": "move" }
```

### micro_bars — micronutrient/goal bars (unit required)
```json
{ "kind": "micro_bars",
  "items": [
    { "label": "Protein", "value": 82, "goal": 120, "unit": "g", "hue": "nutrition" },
    { "label": "Fiber", "value": 18, "goal": 30, "unit": "g", "hue": "move" } ] }
```

### badge — a single chip
```json
{ "kind": "badge", "text": "New 7-day HRV high", "hue": "mind" }
```
Or `"tone"`: one of neutral|positive|warning|danger|info|accent (instead of hue).

---

## canvas — Skia escape hatch (LAST RESORT)

Use only when no block above fits. Pass to `emit_canvas`:
`{ width, height, background?, ops: [...] }`. Coordinates are a virtual
`width×height` space scaled to the card. Unset colors default to the app theme.

Draw ops (each an object in `ops`):
```jsonc
{ "op": "rect", "x":0,"y":0,"w":100,"h":40, "rx":8, "fill":"sleep", "opacity":0.9 }
{ "op": "rect", ... , "stroke":"#888CF9", "strokeWidth":1 }   // stroke instead of/with fill
{ "op": "circle", "cx":50,"cy":50,"r":20, "fill":"recovery" }
{ "op": "line", "x1":0,"y1":0,"x2":100,"y2":0, "stroke":"mind", "strokeWidth":2, "dash":[4,4] }
{ "op": "path", "d":"M0 50 C 40 10, 60 90, 100 50", "stroke":"heart", "strokeWidth":2 }  // SVG path
{ "op": "poly", "points":[[0,0],[50,30],[100,0]], "fill":"energy", "closed":true }
{ "op": "text", "x":10,"y":24, "text":"7h 57m", "size":18, "color":"#F8FAFC",
  "weight":"bold", "align":"left", "font":"display" }   // font: display|sans|mono
{ "op": "image", "src":"https://… or data:image/png;base64,…", "x":0,"y":0,"w":64,"h":64, "fit":"contain" }
{ "op": "lineargradient", "id":"g1", "x1":0,"y1":0,"x2":0,"y2":100,
  "stops":[ {"offset":0,"color":"sleep"}, {"offset":1,"color":"#0A0E1A"} ] }
{ "op": "group", "transform": { "translate":[10,10], "rotate":15, "scale":1.2 }, "ops":[ ... ] }
```
To fill a shape with a gradient: define a `lineargradient` op with an `id`, then
set that shape's `"fill": "url(#id)"`.

Example mini-chart:
```json
{ "kind": "canvas", "width": 300, "height": 120, "background": "#131A2B",
  "ops": [
    { "op": "lineargradient", "id": "fade", "x1":0,"y1":0,"x2":0,"y2":120,
      "stops":[ {"offset":0,"color":"sleep","opacity":0.6}, {"offset":1,"color":"sleep","opacity":0} ] },
    { "op": "path", "d": "M0 90 L60 70 L120 80 L180 40 L240 55 L300 30 L300 120 L0 120 Z", "fill": "url(#fade)" },
    { "op": "path", "d": "M0 90 L60 70 L120 80 L180 40 L240 55 L300 30", "stroke": "sleep", "strokeWidth": 2 },
    { "op": "text", "x": 8, "y": 20, "text": "Deep sleep, 7 nights", "size": 12, "color": "#94A3B8" } ] }
```
