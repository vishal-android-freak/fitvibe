/* FitVibe — Body tab content. Title + segmented control (Vitals / Nutrition /
   Activity), the section views, a floating + log button → menu → confirm sheets.
   Renders inside FitVibeApp. Exports: BodyContent. */

const BODY_SEGS = [
  { id: "vitals", label: "Vitals" },
  { id: "nutrition", label: "Nutrition" },
  { id: "activity", label: "Activity" },
];

function Segmented({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-pill)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline)", marginTop: 14 }}>
      {BODY_SEGS.map((s) => {
        const on = value === s.id;
        return (
          <button key={s.id} onClick={() => onChange(s.id)} style={{
            flex: 1, height: 38, borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
            fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "var(--text-sm)",
            background: on ? "var(--accent)" : "transparent", color: on ? "var(--text-on-accent)" : "var(--text-muted)",
            transition: "color var(--dur-base) var(--ease-out)",
          }}>{s.label}</button>
        );
      })}
    </div>
  );
}

function BodyToast({ children, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 2400); return () => clearTimeout(t); }, []);
  return (
    <div className="fv-toast" style={{
      position: "absolute", left: 18, right: 18, bottom: 100, zIndex: 82,
      display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", borderRadius: "var(--radius-lg)",
      background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)", color: "var(--text-body)",
    }}>
      <span style={{ width: 30, height: 30, borderRadius: "50%", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--ai-gradient)", color: "#05131F" }}>
        <window.Icon name="check" size={17} stroke={2.6} />
      </span>
      <span style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.35 }}>{children}</span>
    </div>
  );
}

function BodyContent() {
  const [seg, setSeg] = React.useState("vitals");
  const [menu, setMenu] = React.useState(false);
  const [sheet, setSheet] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const pick = (id) => { setMenu(false); setTimeout(() => setSheet(id), 180); };
  const confirm = (msg) => { setSheet(null); setToast(msg || "Logged"); };

  return (
    <React.Fragment>
      <window.Scroll>
        <div style={{ paddingTop: 12 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", letterSpacing: "var(--tracking-tight)", margin: 0, color: "var(--text-strong)" }}>Body</h1>
          <Segmented value={seg} onChange={setSeg} />
        </div>

        <div style={{ marginTop: 4 }}>
          {seg === "vitals" && <window.BodyVitals />}
          {seg === "nutrition" && <window.BodyNutrition />}
          {seg === "activity" && <window.BodyActivity />}
        </div>

        <div style={{ height: 8 }} />
      </window.Scroll>

      <window.LogFab open={menu} onClick={() => setMenu((m) => !m)} />
      <window.LogMenu open={menu} onClose={() => setMenu(false)} onPick={pick} />
      <window.LogSheet kind={sheet} onClose={() => setSheet(null)} onConfirm={confirm} />
      {toast && <BodyToast onClose={() => setToast(null)}>{toast}</BodyToast>}
    </React.Fragment>
  );
}

Object.assign(window, { BodyContent });
