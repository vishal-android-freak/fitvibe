/* FitVibe — Insights tab content. Header → spotlight (featured) → weekly recap
   → category filter chips → recency-grouped feed of derived insights. Each card
   taps into Ask FitVibe seeded with a tailored question. Exports: InsightsContent. */

function Spotlight({ onAsk }) {
  const { InsightCard } = window.FitVibeDesignSystem_52b6f8;
  const s = window.SPOTLIGHT;
  return (
    <button onClick={() => onAsk(s.seed)} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit" }}>
      <InsightCard eyebrow="Insight of the week" title={s.title}>
        {s.body}
        <div style={{ marginTop: 14 }}>
          <window.RecoverySignals />
        </div>
        {/* provenance */}
        <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-faint)" }}>Derived from</span>
            {s.prov.map((m) => (
              <span key={m.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px 4px 7px", borderRadius: "var(--radius-pill)", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)" }}>
                <span style={{ color: m.hue, display: "inline-flex" }}><window.Icon name={m.icon} size={12} /></span>
                <span style={{ fontSize: "var(--text-2xs)", fontWeight: 600, color: "var(--text-body)" }}>{m.label}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, color: "var(--text-faint)" }}>
            <window.Icon name="watch" size={12} />
            <span style={{ fontSize: "var(--text-2xs)" }}>{s.source}</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 13, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--accent)" }}>
          <window.Icon name="sparkles" size={14} /> Ask about this
        </div>
      </InsightCard>
    </button>
  );
}

function FilterChips({ value, onChange }) {
  const { Chip } = window.FitVibeDesignSystem_52b6f8;
  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -20px", padding: "0 20px 2px" }}>
      {window.INSIGHT_CATS.map((c) => (
        <span key={c.id} onClick={() => onChange(c.id)} style={{ cursor: "pointer", flex: "0 0 auto" }}>
          <Chip selected={value === c.id}>{c.label}</Chip>
        </span>
      ))}
    </div>
  );
}

const GROUPS = [
  { id: "new", label: "New" },
  { id: "week", label: "This week" },
  { id: "earlier", label: "Earlier" },
];

function InsightsContent({ onAsk = () => {} }) {
  const [cat, setCat] = React.useState("all");
  const list = window.INSIGHTS.filter((i) => cat === "all" || i.cat === cat);

  return (
    <window.Scroll>
      <div style={{ paddingTop: 12, marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", letterSpacing: "var(--tracking-tight)", margin: 0, color: "var(--text-strong)" }}>Insights</h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "4px 0 0" }}>Derived from your Google Health data</p>
      </div>

      <Spotlight onAsk={onAsk} />

      <div style={{ marginTop: 14 }}>
        <window.WeeklyRecap onAsk={onAsk} />
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "linear-gradient(var(--bg-app) 72%, transparent)", paddingTop: 18, paddingBottom: 8, margin: "4px 0 0" }}>
        <FilterChips value={cat} onChange={setCat} />
      </div>

      {GROUPS.map((g) => {
        const items = list.filter((i) => i.group === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id}>
            <div className="fv-eyebrow" style={{ color: "var(--text-faint)", margin: "16px 2px 11px" }}>{g.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((i) => <window.InsightFeedCard key={i.id} insight={i} onAsk={onAsk} />)}
            </div>
          </div>
        );
      })}

      {list.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: "var(--text-sm)" }}>
          No insights in this category yet.
        </div>
      )}

      <div style={{ height: 8 }} />
    </window.Scroll>
  );
}

Object.assign(window, { InsightsContent });
