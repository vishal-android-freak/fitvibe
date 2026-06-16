/* FitVibe — Connecting state. Syncs each granted scope one-by-one, then advances. */
function ConnectingScreen({ scopes, onDone }) {
  const list = (scopes && scopes.length ? scopes : window.GA_SCOPES).slice(0, 7);
  const [doneCount, setDoneCount] = React.useState(0);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    let cancelled = false;
    let n = 0;
    const total = list.length;
    const step = () => {
      if (cancelled) return;
      n += 1;
      setDoneCount(n);
      if (n >= total) {
        setTimeout(() => { if (!cancelled) onDoneRef.current && onDoneRef.current(); }, 700);
      } else {
        setTimeout(step, 320);
      }
    };
    const start = setTimeout(step, 480);
    return () => { cancelled = true; clearTimeout(start); };
  }, []);

  const pct = Math.round((doneCount / list.length) * 100);

  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 54, display: "flex", flexDirection: "column", padding: "54px 28px 32px" }}>
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 0 26px" }}>
        <div style={{ position: "relative", width: 92, height: 92, marginBottom: 22 }}>
          <window.Spinner size={92} color="var(--accent)" stroke={2} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <window.Icon name="heart-pulse" size={34} color="var(--accent)" />
          </div>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", margin: "0 0 6px", color: "var(--text-strong)", letterSpacing: "var(--tracking-tight)" }}>
          Bringing your data to life
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
          Syncing {list.length} data types from Google&nbsp;Health
        </p>
      </div>

      {/* progress track */}
      <div style={{ height: 6, borderRadius: 999, background: "var(--ring-track)", overflow: "hidden", margin: "0 2px 18px" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: "var(--ai-gradient)", transition: "width var(--dur-slow) var(--ease-out)" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((s, i) => {
          const isDone = i < doneCount;
          const isActive = i === doneCount;
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: "var(--radius-md)",
              background: "var(--surface-card)", boxShadow: "var(--ring-hairline)",
              opacity: isDone || isActive ? 1 : 0.45,
              transition: "opacity var(--dur-base) var(--ease-out)",
            }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: s.hue + "22", color: s.hue }}>
                <window.Icon name={s.icon} size={18} />
              </span>
              <span style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-body)" }}>{s.label}</span>
              <span style={{ width: 24, height: 24, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {isDone
                  ? <span className="fv-pop" style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "var(--text-on-accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><window.Icon name="check" size={15} stroke={3} /></span>
                  : isActive
                    ? <window.Spinner size={20} color="var(--accent)" />
                    : <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--border-strong)" }} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ConnectingScreen });
