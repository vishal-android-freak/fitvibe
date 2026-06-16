/* FitVibe — Today hero. A swipeable carousel of hero "pages" with dot
   indicators: Readiness score (lead), Activity rings, Heart.
   Drag horizontally, scroll, or tap the dots. Exports: HeroCarousel. */

function useRingFill(targets) {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setOn(true), 200); return () => clearTimeout(t); }, []);
  return targets.map((v) => (on ? v : 0));
}

const FACTORS = [
  { icon: "activity", hue: "var(--hue-mind)", label: "HRV", val: "62 ms", delta: "▲ 12%", good: true },
  { icon: "heart", hue: "var(--hue-heart)", label: "Resting HR", val: "54 bpm", delta: "▼ 3", good: true },
  { icon: "moon", hue: "var(--hue-sleep)", label: "Sleep", val: "7h 12m", delta: "good", good: true },
];

/* ---- Page 1: Readiness score ---- */
function ReadinessPage({ score = 86 }) {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const v = useRingFill([0.86])[0];
  return (
    <React.Fragment>
      <div className="fv-pop" style={{ position: "relative" }}>
        <ProgressRing value={v} hue="var(--accent)" size={172} thickness={15}
          style={{ filter: "drop-shadow(0 0 24px rgba(74,222,128,.22))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: "var(--text-strong)" }}>{score}</span>
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 3, letterSpacing: "var(--tracking-wide)" }}>READY TO PUSH</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 18, width: "100%" }}>
        {FACTORS.map((f) => (
          <div key={f.label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "9px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: f.hue }}>
              <window.Icon name={f.icon} size={13} />
              <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>{f.label}</span>
            </span>
            <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1 }}>{f.val}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: f.good ? "var(--positive)" : "var(--text-muted)" }}>{f.delta}</span>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ---- Page 2: Activity rings ---- */
const RING_DEFS = [
  { key: "move", hue: "var(--hue-move)", target: 0.82, label: "Move", val: "612", goal: "750" },
  { key: "exercise", hue: "var(--hue-oxygen)", target: 0.64, label: "Exercise", val: "32", goal: "50" },
  { key: "active", hue: "var(--hue-heart)", target: 0.47, label: "Active", val: "9", goal: "12" },
];
function RingsPage() {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const vals = useRingFill(RING_DEFS.map((r) => r.target));
  const rings = RING_DEFS.map((r, i) => ({ value: vals[i], hue: r.hue }));
  return (
    <React.Fragment>
      <div className="fv-pop" style={{ position: "relative" }}>
        <ProgressRing rings={rings} size={184} style={{ filter: "drop-shadow(0 0 20px rgba(74,222,128,.16))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="fv-eyebrow" style={{ color: "var(--text-faint)", marginBottom: 2 }}>activity</span>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--text-strong)" }}>82%</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 18 }}>
        {RING_DEFS.map((r) => (
          <div key={r.key} style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.hue, boxShadow: `0 0 8px ${r.hue}` }} />
              <span style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 600 }}>{r.label}</span>
            </div>
            <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-strong)", lineHeight: 1 }}>
              {r.val}<span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>/{r.goal}</span>
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ---- Page 3: Heart ---- */
function HeartPage() {
  const { Sparkline } = window.FitVibeDesignSystem_52b6f8;
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span className="fv-eyebrow" style={{ color: "var(--hue-heart)", marginBottom: 10 }}>heart</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 700, lineHeight: 1, color: "var(--text-strong)" }}>54</span>
        <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", fontWeight: 600 }}>bpm</span>
      </div>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>resting heart rate · lowest this month</span>
      <div className="fv-pop" style={{ marginTop: 16 }}>
        <Sparkline data={[58, 57, 59, 56, 55, 54, 54]} hue="var(--hue-heart)" width={264} height={56} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, width: "100%" }}>
        {[["HRV", "62 ms", "var(--hue-mind)"], ["Range", "48–142", "var(--hue-heart)"]].map(([k, v, hue]) => (
          <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline)" }}>
            <span style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 600 }}>{k}</span>
            <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: hue, lineHeight: 1 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroCarousel() {
  const scroller = React.useRef(null);
  const drag = React.useRef({ down: false, x: 0, left: 0, moved: false });
  const [idx, setIdx] = React.useState(0);
  const pages = [
    { key: "Readiness", el: <ReadinessPage /> },
    { key: "Activity", el: <RingsPage /> },
    { key: "Heart", el: <HeartPage /> },
  ];

  const onScroll = () => { const el = scroller.current; if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth)); };
  const go = (i) => { const el = scroller.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); };

  const onDown = (e) => { const el = scroller.current; drag.current = { down: true, x: e.clientX, left: el.scrollLeft, moved: false }; };
  const onMove = (e) => {
    if (!drag.current.down) return;
    const el = scroller.current; const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.left - dx;
  };
  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    const el = scroller.current; go(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <div ref={scroller} onScroll={onScroll}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        style={{
          display: "flex", overflowX: "auto", scrollSnapType: "x mandatory",
          cursor: drag.current.down ? "grabbing" : "grab", userSelect: "none",
        }}>
        {pages.map((p) => (
          <div key={p.key} style={{ flex: "0 0 100%", scrollSnapAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 286, padding: "4px 2px" }}>
            {p.el}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 12 }}>
        {pages.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} aria-label={"Show " + p.key} style={{
            height: 7, width: i === idx ? 22 : 7, borderRadius: 999, border: "none", padding: 0,
            background: i === idx ? "var(--accent)" : "var(--border-strong)", cursor: "pointer",
            transition: "width var(--dur-base) var(--ease-out), background var(--dur-base)",
          }} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HeroCarousel });
