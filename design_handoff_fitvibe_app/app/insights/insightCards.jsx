/* FitVibe — Insights data + feed card. Each insight is derived from specific
   Google Health data points (shown as provenance) and carries an inline viz.
   Exports: INSIGHTS, SPOTLIGHT, INSIGHT_CATS, InsightFeedCard, WeeklyRecap. */

function IB({ children }) {
  return <strong style={{ color: "var(--text-strong)", fontWeight: 700 }}>{children}</strong>;
}

const INSIGHT_CATS = [
  { id: "all", label: "All", hue: "var(--accent)", icon: "sparkles" },
  { id: "recovery", label: "Recovery", hue: "var(--accent)", icon: "battery-charging" },
  { id: "sleep", label: "Sleep", hue: "var(--hue-sleep)", icon: "moon" },
  { id: "heart", label: "Heart", hue: "var(--hue-heart)", icon: "heart" },
  { id: "activity", label: "Activity", hue: "var(--hue-move)", icon: "footprints" },
  { id: "nutrition", label: "Nutrition", hue: "var(--hue-nutrition)", icon: "utensils" },
];
const CAT = Object.fromEntries(INSIGHT_CATS.map((c) => [c.id, c]));

const TYPE = {
  trend: { label: "Trend", icon: "trending-up" },
  correlation: { label: "Correlation", icon: "git-compare-arrows" },
  flag: { label: "Flag", icon: "alert-circle" },
  achievement: { label: "Achievement", icon: "award" },
  tip: { label: "Recommendation", icon: "lightbulb" },
  comparison: { label: "Comparison", icon: "chart-no-axes-column" },
};

/* ── mini visualizations ── */
function MiniSpark({ data, hue }) {
  const { Sparkline } = window.FitVibeDesignSystem_52b6f8;
  return <Sparkline data={data} hue={hue} width={300} height={50} style={{ width: "100%" }} />;
}
function MiniBars({ data, labels, hue }) {
  const { BarChart } = window.FitVibeDesignSystem_52b6f8;
  return <BarChart data={data} labels={labels} hue={hue} height={76} />;
}
function StreakDots({ filled, total, hue }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: 30, height: 30, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: i < filled ? hue : "var(--ring-track)", color: "#05131F",
          boxShadow: i < filled ? `0 0 10px color-mix(in oklab, ${hue} 55%, transparent)` : "none",
        }}>
          {i < filled && <window.Icon name="check" size={16} stroke={3} />}
        </span>
      ))}
    </div>
  );
}
function MiniRing({ value, hue, center }) {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const [v, setV] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setV(value), 150); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        <ProgressRing value={v} hue={hue} size={92} thickness={10} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-strong)" }}>{center}</span>
        </div>
      </div>
    </div>
  );
}
function Viz({ viz }) {
  if (!viz) return null;
  let el = null;
  if (viz.kind === "spark") el = <MiniSpark data={viz.data} hue={viz.hue} />;
  else if (viz.kind === "bars") el = <MiniBars data={viz.data} labels={viz.labels} hue={viz.hue} />;
  else if (viz.kind === "streak") el = <StreakDots filled={viz.filled} total={viz.total} hue={viz.hue} />;
  else if (viz.kind === "ring") el = <MiniRing value={viz.value} hue={viz.hue} center={viz.center} />;
  return <div style={{ margin: "14px 0 2px" }}>{el}</div>;
}

/* ── provenance ── */
function Provenance({ items, source }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        <span style={{ fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-faint)", marginRight: 2 }}>Derived from</span>
        {items.map((m) => (
          <span key={m.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px 4px 7px", borderRadius: "var(--radius-pill)", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)" }}>
            <span style={{ color: m.hue || "var(--text-muted)", display: "inline-flex" }}><window.Icon name={m.icon} size={12} /></span>
            <span style={{ fontSize: "var(--text-2xs)", fontWeight: 600, color: "var(--text-body)" }}>{m.label}</span>
          </span>
        ))}
      </div>
      {source && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, color: "var(--text-faint)" }}>
          <window.Icon name="watch" size={12} />
          <span style={{ fontSize: "var(--text-2xs)" }}>{source}</span>
        </div>
      )}
    </div>
  );
}

const M = {
  rhr: { icon: "heart", label: "Resting HR", hue: "var(--hue-heart)" },
  hrv: { icon: "activity", label: "HRV", hue: "var(--hue-mind)" },
  deep: { icon: "moon", label: "Deep sleep", hue: "var(--hue-sleep)" },
  sleep: { icon: "moon", label: "Sleep", hue: "var(--hue-sleep)" },
  meals: { icon: "utensils", label: "Meal times", hue: "var(--hue-nutrition)" },
  steps: { icon: "footprints", label: "Steps", hue: "var(--hue-move)" },
  energy: { icon: "flame", label: "Active energy", hue: "var(--hue-energy)" },
  zone: { icon: "timer", label: "Zone minutes", hue: "var(--hue-heart)" },
  vo2: { icon: "gauge", label: "VO₂ max", hue: "var(--hue-move)" },
  pace: { icon: "footprints", label: "Pace", hue: "var(--hue-move)" },
  hydration: { icon: "glass-water", label: "Hydration", hue: "var(--hue-hydration)" },
  readiness: { icon: "battery-charging", label: "Readiness", hue: "var(--accent)" },
};
const prov = (...keys) => keys.map((k) => M[k]);

/* ── the spotlight (featured) insight ── */
const SPOTLIGHT = {
  id: "spot", cat: "recovery", type: "trend",
  title: "Your recovery is trending up",
  body: (
    <React.Fragment>
      Over the last 7 days your <IB>resting HR fell 3 bpm</IB> and <IB>HRV rose 12%</IB> — your body is adapting well to your training load. Five nights of 7h+ sleep are doing the heavy lifting.
    </React.Fragment>
  ),
  prov: prov("hrv", "rhr", "deep"),
  source: "Fitbit Charge 6 · synced 4 min ago",
  seed: "What's driving my recovery improvement?",
};

/* ── feed insights (newest first) ── */
const INSIGHTS = [
  {
    id: "late-meals", group: "new", isNew: true, cat: "sleep", type: "correlation", time: "Today",
    headline: "Late dinners are costing you deep sleep",
    body: <React.Fragment>On the <IB>4 nights you ate after 9 PM</IB>, deep sleep averaged <IB>22% lower</IB>. Late digestion keeps core temperature up, blunting deep sleep early in the night.</React.Fragment>,
    viz: { kind: "bars", data: [78, 61], labels: ["Early dinner", "Late dinner"], hue: "var(--hue-sleep)" },
    prov: prov("meals", "deep"), seed: "How are late meals affecting my deep sleep?",
  },
  {
    id: "rhr-spike", group: "new", isNew: true, cat: "heart", type: "flag", time: "Today",
    headline: "Resting HR ran high on Thursday",
    body: <React.Fragment>Thursday's resting HR was <IB>6 bpm above baseline</IB>, lining up with a late night and lower HRV. It settled back by Saturday — nothing to worry about.</React.Fragment>,
    viz: { kind: "bars", data: [49, 50, 48, 56, 50, 48, 49], labels: ["M", "T", "W", "T", "F", "S", "S"], hue: "var(--hue-heart)" },
    prov: prov("rhr", "sleep", "hrv"), seed: "Why was my resting heart rate elevated Thursday?",
  },
  {
    id: "move-streak", group: "week", cat: "activity", type: "achievement", time: "2 days ago",
    headline: "6-day move streak — your longest this month",
    body: <React.Fragment>You've closed your move ring <IB>6 days running</IB>, averaging <IB>8,240 steps</IB> a day. One more today makes it a full week.</React.Fragment>,
    viz: { kind: "streak", filled: 6, total: 7, hue: "var(--hue-move)" },
    prov: prov("energy", "steps"), seed: "How's my move streak going?",
  },
  {
    id: "train-hard", group: "week", cat: "recovery", type: "tip", time: "2 days ago",
    headline: "A good window for a hard session",
    body: <React.Fragment>Your <IB>readiness is 86</IB> with HRV at 62 ms and a fully recovered resting HR. Recent load has been moderate, so your body can absorb a harder effort today.</React.Fragment>,
    viz: { kind: "ring", value: 0.86, hue: "var(--accent)", center: "86" },
    prov: prov("readiness", "hrv", "rhr"), seed: "Should I train hard today?",
  },
  {
    id: "vo2", group: "week", cat: "heart", type: "trend", time: "4 days ago",
    headline: "Your VO₂ max is climbing",
    body: <React.Fragment>Up from <IB>42 to 44 ml/kg</IB> this month. You're holding the same pace at a lower heart rate — your aerobic engine is getting more efficient.</React.Fragment>,
    viz: { kind: "spark", data: [42, 42, 43, 43, 43, 44, 44], hue: "var(--hue-move)" },
    prov: prov("vo2", "pace", "rhr"), seed: "Why is my VO₂ max improving?",
  },
  {
    id: "vs-last", group: "week", cat: "activity", type: "comparison", time: "5 days ago",
    headline: "More active than last week",
    body: <React.Fragment>Active zone minutes are <IB>up 18%</IB> (186 vs 158) and you hit your move goal <IB>6 of 7 days</IB> versus 4 last week.</React.Fragment>,
    viz: { kind: "bars", data: [158, 186], labels: ["Last week", "This week"], hue: "var(--hue-move)" },
    prov: prov("zone", "steps"), seed: "Compare my activity to last week",
  },
  {
    id: "hydration", group: "earlier", cat: "nutrition", type: "correlation", time: "Last week",
    headline: "Hydration dips on weekends",
    body: <React.Fragment>Weekdays you average <IB>2.3 L</IB>, but Saturday and Sunday drop to <IB>~1.4 L</IB> — likely a broken routine away from your desk.</React.Fragment>,
    viz: { kind: "bars", data: [2.3, 2.4, 2.2, 2.3, 2.1, 1.4, 1.5], labels: ["M", "T", "W", "T", "F", "S", "S"], hue: "var(--hue-hydration)" },
    prov: prov("hydration"), seed: "Why does my hydration drop on weekends?",
  },
];

/* ── the feed card ── */
function TypeTag({ cat, type }) {
  const c = CAT[cat], t = TYPE[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--radius-pill)", background: `color-mix(in oklab, ${c.hue} 15%, transparent)`, color: c.hue }}>
      <window.Icon name={t.icon} size={12} />
      <span style={{ fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "0.02em" }}>{t.label}</span>
    </span>
  );
}

function Feedback() {
  const [v, setV] = React.useState(null);
  const b = (val, icon) => (
    <button onClick={(e) => { e.stopPropagation(); setV(v === val ? null : val); }} aria-label={val} style={{
      width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
      background: v === val ? "var(--accent-soft)" : "transparent", color: v === val ? "var(--accent)" : "var(--text-faint)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}><window.Icon name={icon} size={15} /></button>
  );
  return <div style={{ display: "flex", gap: 2 }}>{b("up", "thumbs-up")}{b("down", "thumbs-down")}</div>;
}

function InsightFeedCard({ insight, onAsk }) {
  const c = CAT[insight.cat];
  return (
    <div onClick={() => onAsk(insight.seed)} role="button" tabIndex={0} className="insight-card" style={{
      display: "block", width: "100%", textAlign: "left", cursor: "pointer",
      padding: "16px 16px 14px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)",
      boxShadow: "var(--ring-hairline), var(--ring-card)", transition: "transform var(--dur-base) var(--ease-out)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
        <TypeTag cat={insight.cat} type={insight.type} />
        {insight.isNew && <span style={{ fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "0.04em", color: "var(--accent)", textTransform: "uppercase" }}>New</span>}
        <span style={{ marginLeft: "auto", fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{insight.time}</span>
      </div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700, lineHeight: 1.25, letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)", margin: "0 0 8px" }}>{insight.headline}</h3>
      <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--text-secondary)", margin: 0 }}>{insight.body}</p>

      <Viz viz={insight.viz} />

      <Provenance items={insight.prov} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--accent)" }}>
          <window.Icon name="sparkles" size={14} /> Ask about this
        </span>
        <Feedback />
      </div>
    </div>
  );
}

/* ── weekly recap ── */
function WeeklyRecap({ onAsk }) {
  const stats = [
    { icon: "moon", hue: "var(--hue-sleep)", value: "7h 02m", label: "avg sleep" },
    { icon: "heart", hue: "var(--hue-heart)", value: "49", label: "avg resting HR" },
    { icon: "flame", hue: "var(--hue-move)", value: "6/7", label: "move goals" },
    { icon: "battery-charging", hue: "var(--accent)", value: "81", label: "avg readiness" },
  ];
  return (
    <div style={{ padding: "16px 16px 14px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--ai-gradient)", color: "#05131F", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Icon name="calendar-check" size={14} /></span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)" }}>Your week in review</span>
        <span style={{ marginLeft: "auto", fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>Jun 9–15</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <span style={{ color: s.hue, display: "inline-flex" }}><window.Icon name={s.icon} size={16} /></span>
            <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)", marginTop: 5, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: "var(--text-faint)", fontWeight: 600, marginTop: 3, lineHeight: 1.2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { INSIGHTS, SPOTLIGHT, INSIGHT_CATS, InsightFeedCard, WeeklyRecap });
