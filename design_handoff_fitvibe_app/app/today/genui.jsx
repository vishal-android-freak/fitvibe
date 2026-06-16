/* FitVibe — generative-UI blocks the AI can render inside an analysis/reply.
   GaugeArc (270° score gauge), SleepDurationCard, RecoverySignals, TrainingLoad.
   Exports: GaugeArc, SleepDurationCard, RecoverySignals, TrainingLoad. */

const WEEK_LABELS = ["W", "T", "F", "S", "S", "M", "T"];

/* 270° gauge with a gap at the bottom — for the sleep score. */
function GaugeArc({ value = 0.84, size = 84, hue = "var(--hue-sleep)", icon = "moon" }) {
  const cx = size / 2, r = cx - 9, stroke = 9;
  const SWEEP = 270, START = -135;
  const pt = (deg) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cx - r * Math.cos(a)];
  };
  const arc = (a, b) => {
    const s = pt(a), e = pt(b), large = b - a > 180 ? 1 : 0;
    return `M ${s[0].toFixed(2)} ${s[1].toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
  };
  const [fill, setFill] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setFill(value), 120); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arc(START, START + SWEEP)} fill="none" stroke={hue} strokeOpacity="0.16" strokeWidth={stroke} strokeLinecap="round" />
        <path d={arc(START, START + SWEEP * fill)} fill="none" stroke={hue} strokeWidth={stroke} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px color-mix(in oklab, ${hue} 60%, transparent))`, transition: "all var(--dur-slow) var(--ease-out)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: hue }}>
        <window.Icon name={icon} size={22} />
      </div>
    </div>
  );
}

function SleepDurationCard({ duration = "7h 12m", score = 84, rating = "Good" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)" }}>
      <div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 6 }}>Sleep duration</div>
        <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-2xl)", color: "var(--text-strong)", lineHeight: 1, letterSpacing: "var(--tracking-tight)", whiteSpace: "nowrap" }}>{duration}</div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 8 }}>
          <span className="fv-stat" style={{ color: "var(--text-body)", fontWeight: 700 }}>{score}</span> · {rating}
        </div>
      </div>
      <GaugeArc value={score / 100} />
    </div>
  );
}

function SignalCard({ label, value, unit, hue, week, status = "In range" }) {
  const { Sparkline, Badge } = window.FitVibeDesignSystem_52b6f8;
  return (
    <div style={{ flex: 1, minWidth: 0, padding: "14px 14px 13px", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.25, minHeight: 30 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-2xl)", color: "var(--text-strong)", lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>{unit}</span>
      </div>
      <Sparkline data={week} hue={hue} width={150} height={38} style={{ width: "100%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 1px" }}>
        {WEEK_LABELS.map((d, i) => (
          <span key={i} style={{ fontSize: 9.5, fontWeight: i === WEEK_LABELS.length - 1 ? 700 : 600, color: i === WEEK_LABELS.length - 1 ? hue : "var(--text-faint)" }}>{d}</span>
        ))}
      </div>
      <div><Badge tone="positive">{status}</Badge></div>
    </div>
  );
}

function RecoverySignals() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <SignalCard label="Resting heart rate" value="54" unit="bpm" hue="var(--hue-heart)" week={[58, 57, 57, 56, 55, 54, 54]} />
      <SignalCard label="Heart rate variability" value="62" unit="ms" hue="var(--hue-mind)" week={[52, 55, 54, 58, 60, 61, 62]} />
    </div>
  );
}

function TrainingLoad() {
  const { BarChart } = window.FitVibeDesignSystem_52b6f8;
  return (
    <div style={{ padding: "16px 16px 12px", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Active minutes</span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>this week</span>
      </div>
      <BarChart data={[18, 40, 26, 52, 38, 12, 32]} labels={WEEK_LABELS} hue="var(--hue-move)" height={92} />
    </div>
  );
}

Object.assign(window, { GaugeArc, SleepDurationCard, RecoverySignals, TrainingLoad });
