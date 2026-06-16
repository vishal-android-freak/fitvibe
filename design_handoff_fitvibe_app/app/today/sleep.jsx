/* FitVibe — Sleep hypnogram (the standard "cityscape" sleep-stage chart).
   Plots discrete stages over time as stepped blocks, ordered Awake→REM→Light→Deep
   top to bottom, with an hour axis and a derived stage breakdown.
   Exports: SleepCard. */

/* A realistic night as [stage, minutes] segments. Deep clusters early,
   REM lengthens toward morning, brief awakenings — totals are DERIVED from
   this so the chart and the breakdown can never disagree. */
const SLEEP_SEGMENTS = [
  ["Light", 32], ["Deep", 28], ["Light", 14], ["Deep", 22], ["REM", 10],
  ["Light", 38], ["Awake", 5], ["Light", 20], ["Deep", 10], ["REM", 16],
  ["Light", 24], ["REM", 14], ["Awake", 6], ["Light", 42], ["Deep", 6],
  ["REM", 22], ["Light", 18], ["REM", 16], ["Awake", 7], ["Light", 22],
  ["REM", 18], ["Light", 20], ["Awake", 6], ["Light", 40],
];

const STAGE_META = {
  Awake: { lane: 0, hue: "var(--hue-heart)", label: "Awake", typical: 0.05 },
  REM:   { lane: 1, hue: "var(--hue-mind)",  label: "REM",   typical: 0.22 },
  Light: { lane: 2, hue: "var(--hue-sleep)", label: "Light", typical: 0.50 },
  Deep:  { lane: 3, hue: "var(--sky-400)",   label: "Deep",  typical: 0.18 },
};

const ONSET_CLOCK = 23 * 60 + 24; // 11:24 PM, minutes since midnight

function fmtClock(c) {
  c = ((c % 1440) + 1440) % 1440;
  const h = Math.floor(c / 60), m = c % 60;
  const ap = h < 12 ? "a" : "p";
  let hh = h % 12; if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, "0")}${ap}`;
}

function Hypnogram({ total }) {
  // coordinate system
  const W = 360, H = 172, padL = 8, padR = 8, padT = 8, padB = 26;
  const labelW = 38;
  const plotL = padL + labelW, plotR = W - padR;
  const plotW = plotR - plotL, plotH = H - padT - padB;
  const laneH = plotH / 4, blockH = 15;
  const laneY = (lane) => padT + lane * laneH + laneH / 2;
  const x = (min) => plotL + (min / total) * plotW;

  // build absolute segments
  let cum = 0;
  const segs = SLEEP_SEGMENTS.map(([stage, dur]) => {
    const s = { stage, start: cum, dur, ...STAGE_META[stage] }; cum += dur; return s;
  });

  // hourly gridlines at even clock hours inside the night
  const ticks = [];
  for (let hh = 0; hh < 24; hh += 2) {
    const off = ((hh * 60 - ONSET_CLOCK) % 1440 + 1440) % 1440;
    if (off > 8 && off < total - 8) ticks.push({ off, label: fmtClock(hh * 60) });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="Sleep stages through the night">
      <defs>
        <filter id="hypGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* lane guide labels + faint baselines */}
      {Object.values(STAGE_META).map((m) => (
        <g key={m.label}>
          <line x1={plotL} y1={laneY(m.lane)} x2={plotR} y2={laneY(m.lane)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="1 5" opacity="0.5" />
          <text x={padL} y={laneY(m.lane) + 3.5} fill="var(--text-faint)" fontSize="10" fontFamily="var(--font-sans)" fontWeight="600">{m.label}</text>
        </g>
      ))}

      {/* hour gridlines */}
      {ticks.map((t) => (
        <g key={t.off}>
          <line x1={x(t.off)} y1={padT} x2={x(t.off)} y2={padT + plotH} stroke="var(--border-subtle)" strokeWidth="1" opacity="0.4" />
          <text x={x(t.off)} y={H - 9} fill="var(--text-faint)" fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="middle">{t.label}</text>
        </g>
      ))}

      {/* connectors (the cityscape steps) */}
      {segs.map((s, i) => {
        if (i === 0) return null;
        const prev = segs[i - 1];
        const xb = x(s.start);
        return <line key={"c" + i} x1={xb} y1={laneY(prev.lane)} x2={xb} y2={laneY(s.lane)} stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />;
      })}

      {/* stage blocks */}
      {segs.map((s, i) => (
        <rect key={i} x={x(s.start)} y={laneY(s.lane) - blockH / 2}
          width={Math.max(2, x(s.start + s.dur) - x(s.start))} height={blockH}
          rx="4" fill={s.hue} opacity="0.95"
          filter={s.lane <= 1 ? "url(#hypGlow)" : undefined} />
      ))}
    </svg>
  );
}

function SleepCard() {
  const { Badge } = window.FitVibeDesignSystem_52b6f8;
  const total = SLEEP_SEGMENTS.reduce((a, [, d]) => a + d, 0);
  const asleep = SLEEP_SEGMENTS.reduce((a, [s, d]) => a + (s === "Awake" ? 0 : d), 0);
  const totals = {}; SLEEP_SEGMENTS.forEach(([s, d]) => (totals[s] = (totals[s] || 0) + d));
  const wake = ONSET_CLOCK + total;
  const eff = Math.round((asleep / total) * 100);
  const order = ["Deep", "REM", "Light", "Awake"];

  return (
    <div style={{ padding: "15px 16px 16px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--hue-sleep)", alignSelf: "center" }}><window.Icon name="moon" size={17} /></span>
            <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-strong)", lineHeight: 1 }}>{window.fmtMin(asleep)}</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>asleep</span>
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
            {fmtClock(ONSET_CLOCK)} – {fmtClock(wake)} · {eff}% efficiency
          </div>
        </div>
        <Badge tone="positive">Best this week</Badge>
      </div>

      {/* hypnogram */}
      <div style={{ marginTop: 6 }}>
        <Hypnogram total={total} />
      </div>

      {/* derived stage breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 8 }}>
        {order.map((key) => {
          const m = STAGE_META[key];
          const min = totals[key] || 0;
          const pct = Math.round((min / total) * 100);
          return (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "62px 1fr 64px", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: m.hue, flex: "0 0 auto" }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-body)", fontWeight: 600 }}>{m.label}</span>
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ height: 6, borderRadius: 999, background: "var(--ring-track)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: m.hue, opacity: 0.9 }} />
                </div>
                {m.typical != null && (
                  <span title={`typical ~${Math.round(m.typical * 100)}%`} style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${Math.round(m.typical * 100)}% - 1px)`, width: 2, borderRadius: 2, background: "var(--text-secondary)", opacity: 0.75 }} />
                )}
              </div>
              <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                <span className="fv-stat" style={{ color: "var(--text-strong)", fontWeight: 600 }}>{window.fmtMin(min)}</span> · {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* typical-range legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, color: "var(--text-faint)" }}>
        <span style={{ width: 2, height: 11, borderRadius: 2, background: "var(--text-secondary)", flex: "0 0 auto" }} />
        <span style={{ fontSize: "var(--text-2xs)", lineHeight: 1.3 }}>marker shows the typical range for your age</span>
      </div>
    </div>
  );
}

Object.assign(window, { SleepCard });
