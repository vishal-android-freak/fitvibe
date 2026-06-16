/* FitVibe — Sleep tab content. Browsable day scroller → score hero → AI insight
   → hypnogram + stage breakdown (reuses SleepCard) → overnight vitals →
   schedule consistency → weekly trend. Renders inside FitVibeApp.
   Exports: SleepContent. */

/* newest first; the scroller indexes into this */
const NIGHTS = [
  { rel: "Last night", day: "Sun", date: "Jun 15", score: 84, rating: "Good", dur: 432, bed: 23 * 60 + 24, wake: 6 * 60 + 48, eff: 91, rhr: 48, hrv: 62, spo2: 97, resp: 14.2, skin: -0.3, moves: 14, hrvDelta: "4 ms" },
  { rel: "Sat night", day: "Sat", date: "Jun 14", score: 76, rating: "Fair", dur: 388, bed: 23 * 60 + 58, wake: 6 * 60 + 42, eff: 87, rhr: 51, hrv: 55, spo2: 96, resp: 14.8, skin: 0.1, moves: 22, hrvDelta: "3 ms" },
  { rel: "Fri night", day: "Fri", date: "Jun 13", score: 81, rating: "Good", dur: 441, bed: 23 * 60 + 36, wake: 6 * 60 + 55, eff: 89, rhr: 49, hrv: 59, spo2: 97, resp: 14.1, skin: -0.2, moves: 17, hrvDelta: "2 ms" },
  { rel: "Thu night", day: "Thu", date: "Jun 12", score: 69, rating: "Fair", dur: 356, bed: 24 * 60 + 14, wake: 6 * 60 + 30, eff: 83, rhr: 53, hrv: 51, spo2: 95, resp: 15.2, skin: 0.3, moves: 28, hrvDelta: "6 ms" },
  { rel: "Wed night", day: "Wed", date: "Jun 11", score: 88, rating: "Great", dur: 468, bed: 22 * 60 + 58, wake: 6 * 60 + 46, eff: 93, rhr: 47, hrv: 66, spo2: 98, resp: 13.8, skin: -0.4, moves: 11, hrvDelta: "5 ms" },
  { rel: "Tue night", day: "Tue", date: "Jun 10", score: 79, rating: "Good", dur: 410, bed: 23 * 60 + 40, wake: 6 * 60 + 30, eff: 88, rhr: 50, hrv: 58, spo2: 97, resp: 14.4, skin: 0.0, moves: 19, hrvDelta: "1 ms" },
  { rel: "Mon night", day: "Mon", date: "Jun 9", score: 73, rating: "Fair", dur: 372, bed: 24 * 60 + 6, wake: 6 * 60 + 18, eff: 85, rhr: 52, hrv: 54, spo2: 96, resp: 15.0, skin: 0.2, moves: 24, hrvDelta: "2 ms" },
];

const TARGET_BED = 23 * 60;       // 11:00p
const TARGET_WAKE = 6 * 60 + 45;  // 6:45a

function clk(c) {
  c = ((c % 1440) + 1440) % 1440;
  const h = Math.floor(c / 60), m = c % 60;
  const ap = h < 12 ? "am" : "pm";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}
function fmtH(min) { const h = Math.floor(min / 60), m = min % 60; return `${h}h ${String(m).padStart(2, "0")}m`; }
function delta(actual, target) {
  const d = actual - target;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${sign}${Math.abs(d)}m`;
}
const ratingHue = (r) => (r === "Great" ? "var(--hue-move)" : r === "Good" ? "var(--accent)" : "var(--hue-energy)");

/* ── day scroller header ── */
function DayScroller({ idx, setIdx, night }) {
  const atNewest = idx === 0;
  const atOldest = idx === NIGHTS.length - 1;
  const chevron = (dir, disabled, onClick) => (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} aria-label={dir === "l" ? "Previous night" : "Next night"} style={{
      width: 40, height: 40, flex: "0 0 auto", borderRadius: "50%", border: "1px solid var(--border-strong)",
      background: "var(--surface-card)", color: disabled ? "var(--text-faint)" : "var(--text-strong)",
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <window.Icon name={dir === "l" ? "chevron-left" : "chevron-right"} size={20} />
    </button>
  );
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", letterSpacing: "var(--tracking-tight)", margin: 0, color: "var(--text-strong)" }}>Sleep</h1>
        <button aria-label="Calendar" style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--text-strong)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <window.Icon name="calendar" size={19} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
        {/* go further back = increase idx */}
        {chevron("l", atOldest, () => setIdx(Math.min(NIGHTS.length - 1, idx + 1)))}
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)" }}>{night.rel}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{night.day}, {night.date}</div>
        </div>
        {chevron("r", atNewest, () => setIdx(Math.max(0, idx - 1)))}
      </div>
    </div>
  );
}

/* ── score hero ── */
function ScoreHero({ night }) {
  const hue = ratingHue(night.rating);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      <window.GaugeArc value={night.score / 100} size={104} hue={hue} icon="moon" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fv-eyebrow" style={{ color: "var(--text-faint)", marginBottom: 6 }}>sleep score</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 46, lineHeight: 1, color: "var(--text-strong)" }}>{night.score}</span>
          <span style={{ fontSize: "var(--text-md)", fontWeight: 700, color: hue }}>{night.rating}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-strong)" }}>{fmtH(night.dur)}</span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{clk(night.bed)} – {clk(night.wake)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── overnight vitals grid ── */
function VitalsGrid({ night }) {
  const { StatTile } = window.FitVibeDesignSystem_52b6f8;
  const tiles = [
    { label: "Resting HR", value: String(night.rhr), unit: "bpm", hue: "var(--hue-heart)", icon: "heart", spark: [52, 51, 50, 49, 49, 48, night.rhr] },
    { label: "HRV", value: String(night.hrv), unit: "ms", hue: "var(--hue-mind)", icon: "activity", delta: night.hrvDelta, deltaDir: "up", spark: [54, 56, 55, 58, 60, 61, night.hrv] },
    { label: "SpO₂", value: String(night.spo2), unit: "%", hue: "var(--hue-oxygen)", icon: "wind", spark: [96, 97, 96, 97, 98, 97, night.spo2] },
    { label: "Respiratory rate", value: night.resp.toFixed(1), unit: "br/min", hue: "var(--sky-400)", icon: "wind", spark: [14.5, 14.2, 14.4, 14.1, 14.0, 14.3, night.resp] },
    { label: "Skin temp", value: (night.skin > 0 ? "+" : "") + night.skin.toFixed(1), unit: "°C", hue: "var(--hue-energy)", icon: "thermometer", spark: [0.1, -0.1, 0.2, -0.2, 0.0, -0.1, night.skin] },
    { label: "Restlessness", value: String(night.moves), unit: "moves", hue: "var(--hue-move)", icon: "move", spark: [18, 22, 16, 24, 14, 19, night.moves] },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {tiles.map((t) => (
        <StatTile key={t.label} label={t.label} value={t.value} unit={t.unit} hue={t.hue}
          icon={<window.Icon name={t.icon} size={16} />} delta={t.delta} deltaDir={t.deltaDir}
          spark={t.spark} style={{ padding: "13px 14px", gap: 7 }} />
      ))}
    </div>
  );
}

/* ── schedule consistency ── */
function ScheduleRow({ icon, hue, label, actual, target, dval }) {
  const off = dval !== "+0m" && dval !== "−0m" && dval !== "0m";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0" }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${hue} 16%, transparent)`, color: hue }}>
        <window.Icon name={icon} size={18} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-strong)" }}>{label}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>target {target}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)" }}>{actual}</div>
        <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: off ? "var(--hue-energy)" : "var(--positive)", marginTop: 1 }}>{dval}</div>
      </div>
    </div>
  );
}
function ScheduleCard({ night }) {
  return (
    <div style={{ padding: "4px 16px 8px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      <ScheduleRow icon="moon" hue="var(--hue-sleep)" label="Bedtime" actual={clk(night.bed)} target={clk(TARGET_BED)} dval={delta(night.bed, TARGET_BED)} />
      <div style={{ borderTop: "1px solid var(--border-subtle)" }} />
      <ScheduleRow icon="sunrise" hue="var(--hue-energy)" label="Wake" actual={clk(night.wake)} target={clk(TARGET_WAKE)} dval={delta(night.wake, TARGET_WAKE)} />
    </div>
  );
}

/* ── weekly trend ── */
function WeeklyTrend({ idx }) {
  const { BarChart } = window.FitVibeDesignSystem_52b6f8;
  const chrono = [...NIGHTS].reverse(); // oldest → newest
  const data = chrono.map((n) => n.dur);
  const labels = chrono.map((n) => n.day[0]);
  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
  const spread = Math.round((Math.max(...data) - Math.min(...data)) / 2);
  return (
    <div style={{ padding: "16px 16px 12px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>7-night average</div>
          <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--text-strong)", marginTop: 2 }}>{fmtH(avg)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>consistency</div>
          <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--text-strong)", marginTop: 2 }}>±{spread}m</div>
        </div>
      </div>
      <BarChart data={data} labels={labels} hue="var(--hue-sleep)" height={96} />
    </div>
  );
}

function SleepContent({ onOpenAnalysis = () => {} }) {
  const { InsightCard, Badge } = window.FitVibeDesignSystem_52b6f8;
  const [idx, setIdx] = React.useState(0);
  const night = NIGHTS[idx];

  return (
    <window.Scroll>
      <DayScroller idx={idx} setIdx={setIdx} night={night} />

      <div style={{ marginTop: 16 }}>
        <ScoreHero night={night} />
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={() => onOpenAnalysis("sleep")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit" }}>
          <InsightCard eyebrow="FitVibe insight" title="Strong recovery, but a late bedtime">
            You slept {fmtH(night.dur)} with deep sleep up 18% and HRV at {night.hrv} ms. A late lights-out trimmed your final REM cycle — aim for an earlier wind-down tonight.
            <div style={{ display: "flex", gap: 7, marginTop: 13, flexWrap: "wrap" }}>
              <Badge hue="sleep">Deep ▲ 18%</Badge>
              <Badge hue="mind">HRV {night.hrv} ms</Badge>
            </div>
          </InsightCard>
        </button>
      </div>

      <window.SectionLabel>Stages</window.SectionLabel>
      <window.SleepCard />

      <window.SectionLabel>Overnight vitals</window.SectionLabel>
      <VitalsGrid night={night} />

      <window.SectionLabel>Schedule</window.SectionLabel>
      <ScheduleCard night={night} />

      <window.SectionLabel action="Month">Last 7 nights</window.SectionLabel>
      <WeeklyTrend idx={idx} />

      <div style={{ height: 8 }} />
    </window.Scroll>
  );
}

Object.assign(window, { SleepContent });
