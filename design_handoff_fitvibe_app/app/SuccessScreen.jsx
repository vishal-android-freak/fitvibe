/* FitVibe — Success / all-set screen. Rings fill, then CTA into the app. */
function SuccessScreen({ account, scopeCount, onEnter, onReplay }) {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const [fill, setFill] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setFill(true), 240); return () => clearTimeout(t); }, []);
  const rings = [
    { value: fill ? 0.82 : 0, hue: "var(--hue-move)" },
    { value: fill ? 0.64 : 0, hue: "var(--hue-oxygen)" },
    { value: fill ? 0.47 : 0, hue: "var(--hue-heart)" },
  ];
  const first = account ? account.name.split(/\s+/)[0] : "there";

  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 54, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <div className="fv-pop" style={{ position: "relative", marginBottom: 30 }}>
          <ProgressRing rings={rings} size={188} style={{ filter: "drop-shadow(0 0 26px rgba(74,222,128,.3))" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="fv-pop" style={{ animationDelay: "520ms", width: 64, height: 64, borderRadius: "50%", background: "var(--ai-gradient)", color: "#05131F", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--glow-ai)" }}>
              <window.Icon name="check" size={34} stroke={3} />
            </span>
          </div>
        </div>
        <h1 className="fv-rise" style={{ animationDelay: "120ms", fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", margin: "0 0 12px", color: "var(--text-strong)", letterSpacing: "var(--tracking-tight)" }}>
          You're all set, {first}.
        </h1>
        <p className="fv-rise" style={{ animationDelay: "200ms", fontSize: "var(--text-md)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: 304, margin: 0 }}>
          FitVibe is connected to Google&nbsp;Health and syncing {scopeCount} data types. Your first insights land as soon as your Fitbit syncs.
        </p>

        <div className="fv-rise" style={{ animationDelay: "300ms", display: "flex", alignItems: "center", gap: 8, marginTop: 22, padding: "9px 16px", borderRadius: "var(--radius-pill)", background: "var(--accent-soft)", color: "var(--accent)" }}>
          <window.Icon name="watch" size={16} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Fitbit Charge 6 · synced 4 min ago</span>
        </div>
      </div>

      <div className="fv-rise" style={{ animationDelay: "380ms", padding: "0 24px 24px" }}>
        {(() => {
          const { Button } = window.FitVibeDesignSystem_52b6f8;
          return (
            <Button variant="ai" size="lg" block onClick={onEnter}
              iconRight={<window.Icon name="arrow-right" size={20} />}>
              Go to your dashboard
            </Button>
          );
        })()}
        <button onClick={onReplay} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: "var(--text-muted)", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          Replay the flow
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { SuccessScreen });
