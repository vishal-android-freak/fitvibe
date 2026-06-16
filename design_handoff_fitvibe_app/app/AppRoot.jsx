/* FitVibe — app shell. Owns the Option B bottom nav, switches between tab
   content (Today / Sleep), and hosts the AI analysis + Ask FitVibe overlays
   so any screen can open them.
   Exports: FitVibeApp, NavB. */

const NAV_B = [
  { id: "today", icon: "house", label: "Today" },
  { id: "sleep", icon: "moon", label: "Sleep" },
  { id: "ask", icon: "sparkles", label: "Ask", ai: true },
  { id: "body", icon: "activity", label: "Body" },
  { id: "insights", icon: "lightbulb", label: "Insights" },
];

function NavB({ active = "today", onChange = () => {} }) {
  return (
    <div style={{
      position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 40, height: 72,
      display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px",
      borderRadius: "var(--radius-2xl)", background: "var(--glass-bg)",
      backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)",
    }}>
      {NAV_B.map((t) => {
        if (t.ai) {
          return (
            <button key={t.id} onClick={() => onChange(t.id)} aria-label={t.label} style={{
              width: 54, height: 54, marginTop: -22, borderRadius: "var(--radius-pill)", border: "none",
              background: "var(--ai-gradient)", color: "#05131F", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--glow-ai)",
              transition: "transform var(--dur-fast) var(--ease-out)",
            }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.92)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}>
              <window.Icon name={t.icon} size={24} stroke={2.4} />
            </button>
          );
        }
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} aria-label={t.label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "8px 6px",
            color: on ? "var(--accent)" : "var(--text-faint)", transition: "color var(--dur-base) var(--ease-out)",
          }}>
            <window.Icon name={t.icon} size={22} stroke={on ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, letterSpacing: ".02em" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShellToast({ children, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 2600); return () => clearTimeout(t); }, []);
  return (
    <div className="fv-toast" style={{
      position: "absolute", left: 18, right: 18, bottom: 98, zIndex: 45,
      display: "flex", alignItems: "center", gap: 11, padding: "13px 16px",
      borderRadius: "var(--radius-lg)", background: "var(--glass-bg)",
      backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)", color: "var(--text-body)",
    }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--accent-soft)", color: "var(--accent)" }}>
        <window.Icon name="hammer" size={16} />
      </span>
      <span style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.35 }}>{children}</span>
    </div>
  );
}

const TAB_LABEL = { insights: "Insights" };

function FitVibeApp() {
  const [tab, setTab] = React.useState("today");
  const [detail, setDetail] = React.useState(null);   // analysis id or null
  const [convo, setConvo] = React.useState(null);      // { seed } or null
  const [toast, setToast] = React.useState(null);

  const openAnalysis = (id) => setDetail(id);

  const onNav = (id) => {
    if (id === "today" || id === "sleep" || id === "body" || id === "insights") { setTab(id); return; }
    if (id === "ask") { setConvo({ seed: null }); return; }
  };

  return (
    <React.Fragment>
      {/* tab content — keep mounted state simple: render the active one */}
      {tab === "today" && <window.TodayContent onOpenAnalysis={openAnalysis} />}
      {tab === "sleep" && <window.SleepContent onOpenAnalysis={openAnalysis} />}
      {tab === "body" && <window.BodyContent />}
      {tab === "insights" && <window.InsightsContent onAsk={(seed) => setConvo({ seed })} />}

      <NavB active={tab} onChange={onNav} />

      {toast && <ShellToast onClose={() => setToast(null)}>{toast}</ShellToast>}

      {detail && (
        <window.AIAnalysisDetail analysis={detail}
          onClose={() => setDetail(null)}
          onContinue={(text) => setConvo({ seed: text || null })} />
      )}
      {convo && (
        <window.AskConversation seed={convo.seed} onClose={() => setConvo(null)} />
      )}
    </React.Fragment>
  );
}

Object.assign(window, { FitVibeApp, NavB });
