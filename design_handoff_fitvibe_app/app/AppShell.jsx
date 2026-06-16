/* FitVibe UI kit — device frame + shared chrome (status bar, tab bar, headers). */

function PhoneFrame({ children }) {
  return (
    <div style={{
      width: 402, height: 858, borderRadius: 56, padding: 12,
      background: "linear-gradient(160deg, #20262F, #0A0D12)",
      boxShadow: "0 50px 120px rgba(0,0,0,.6), inset 0 0 0 1.5px rgba(255,255,255,.06)",
      position: "relative", flex: "0 0 auto",
    }}>
      <div className="fv-field" style={{
        position: "relative", width: "100%", height: "100%", borderRadius: 44,
        overflow: "hidden", background: "var(--bg-app)", backgroundImage: "var(--field-glow)",
      }}>
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 54, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 30px", pointerEvents: "none",
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-strong)" }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-strong)" }}>
        <Icon name="signal" size={16} stroke={2.4} />
        <Icon name="wifi" size={16} stroke={2.4} />
        <Icon name="battery-full" size={20} stroke={2.2} />
      </div>
    </div>
  );
}

/* Scrollable content region; leaves room for status bar + tab bar. */
function Scroll({ children, pad = true, refEl }) {
  return (
    <div ref={refEl} style={{
      position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
      paddingTop: 54, paddingBottom: 104,
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{ padding: pad ? "0 var(--screen-gutter)" : 0 }}>{children}</div>
    </div>
  );
}

/* Sticky glass header used on detail/sub screens. */
function ScreenHeader({ title, sub, onBack, right }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 30, margin: "0 calc(-1 * var(--screen-gutter))",
      padding: "10px var(--screen-gutter) 12px",
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      {onBack && (
        <button onClick={onBack} aria-label="Back" style={{
          width: 40, height: 40, borderRadius: "var(--radius-pill)", border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)", color: "var(--text-strong)", display: "inline-flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto",
        }}><Icon name="chevron-left" size={22} /></button>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--text-strong)", letterSpacing: "var(--tracking-tight)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {sub && <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function SectionLabel({ children, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 12px" }}>
      <span className="fv-eyebrow">{children}</span>
      {action && <button onClick={onAction} style={{ background: "none", border: "none", color: "var(--accent)", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "var(--text-xs)", cursor: "pointer", letterSpacing: "var(--tracking-wide)" }}>{action}</button>}
    </div>
  );
}

const TABS = [
  { id: "today", icon: "house", label: "Today" },
  { id: "trends", icon: "chart-line", label: "Trends" },
  { id: "chat", icon: "sparkles", label: "Ask" },
  { id: "insights", icon: "lightbulb", label: "Insights" },
  { id: "profile", icon: "user", label: "You" },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{
      position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 40, height: 72,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "0 8px", borderRadius: "var(--radius-2xl)",
      background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-lg)",
    }}>
      {TABS.map((t) => {
        const on = active === t.id;
        const isAi = t.id === "chat";
        if (isAi) {
          return (
            <button key={t.id} onClick={() => onChange(t.id)} aria-label={t.label} style={{
              width: 54, height: 54, marginTop: -22, borderRadius: "var(--radius-pill)", border: "none",
              background: "var(--ai-gradient)", color: "#05131F", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-ai)", transition: "transform var(--dur-fast) var(--ease-out)",
            }}
            onMouseDown={(e)=>e.currentTarget.style.transform="scale(.92)"}
            onMouseUp={(e)=>e.currentTarget.style.transform="scale(1)"}
            onMouseLeave={(e)=>e.currentTarget.style.transform="scale(1)"}>
              <Icon name={t.icon} size={24} stroke={2.4} />
            </button>
          );
        }
        return (
          <button key={t.id} onClick={() => onChange(t.id)} aria-label={t.label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "8px 6px",
            color: on ? "var(--accent)" : "var(--text-faint)",
            transition: "color var(--dur-base) var(--ease-out)",
          }}>
            <Icon name={t.icon} size={22} stroke={on ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, letterSpacing: ".02em" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { PhoneFrame, StatusBar, Scroll, ScreenHeader, SectionLabel, TabBar });
