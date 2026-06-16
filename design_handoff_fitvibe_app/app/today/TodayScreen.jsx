/* FitVibe — Today content (renders inside the shared FitVibeApp shell, which
   owns the bottom nav and the AI analysis / conversation overlays).
   Exports: TodayContent. */

function greetingFor(h) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function aiLineFor(h) {
  if (h < 11) return "You woke well-recovered — 82% of your move goal is still ahead of you.";
  if (h < 15) return "You're 82% to your move goal with the afternoon still ahead. Nicely paced.";
  if (h < 20) return "Strong day — one short walk closes your move ring.";
  return "You've hit your rings. Wind down soon to protect that HRV streak.";
}

function Header() {
  const { Avatar } = window.FitVibeDesignSystem_52b6f8;
  const now = new Date();
  const h = now.getHours();
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <div style={{ paddingTop: 12, paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="fv-eyebrow" style={{ color: "var(--text-faint)", marginBottom: 5 }}>{date}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", letterSpacing: "var(--tracking-tight)", margin: 0, color: "var(--text-strong)", lineHeight: 1.1 }}>
            {greetingFor(h)}, Maya
          </h1>
        </div>
        <button aria-label="Your profile" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", flex: "0 0 auto" }}>
          <Avatar name="Maya Okonkwo" size={44} ring />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 14, padding: "11px 13px", borderRadius: "var(--radius-md)",
        background: "var(--ai-soft)", border: "1px solid transparent",
        backgroundImage: "linear-gradient(var(--ai-soft), var(--ai-soft)), var(--ai-gradient)", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
        <span style={{ width: 22, height: 22, flex: "0 0 auto", borderRadius: 7, marginTop: 1, background: "var(--ai-gradient)", color: "#05131F", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <window.Icon name="sparkles" size={13} />
        </span>
        <span style={{ fontSize: "var(--text-sm)", lineHeight: 1.45, color: "var(--text-body)", fontWeight: 500 }}>{aiLineFor(h)}</span>
      </div>
    </div>
  );
}

/* ---- context cards ---- */
/* SleepCard (hypnogram) lives in app/today/sleep.jsx → window.SleepCard */

const ACTIVITY = [
  { time: "12:05", kind: "logged", icon: "brain", hue: "var(--hue-mind)", title: "Mindfulness", detail: "10 min · calm session" },
  { time: "10:30", kind: "logged", icon: "glass-water", hue: "var(--hue-hydration)", title: "Logged water", detail: "+250 ml · 1.6 L today" },
  { time: "9:14", kind: "tracked", icon: "route", hue: "var(--hue-move)", title: "Morning walk", detail: "1.1 km · 14 min · 78 kcal" },
  { time: "7:38", kind: "ai", id: "run", title: "Run analysis", body: "That run sat in zone 2 almost the whole way — ideal aerobic work. Your heart rate drifted up only 4 bpm at a steady pace, a sign your base is improving. Keep tomorrow easy to lock in the gains." },
  { time: "7:02", kind: "tracked", icon: "footprints", hue: "var(--hue-move)", title: "Outdoor run", detail: "5.2 km · 27:41 · 384 kcal", badge: "Workout" },
  { time: "6:52", kind: "ai", id: "sleep", title: "Sleep analysis", body: "You slept 7h 12m with deep sleep up 18% vs last week. HRV came in at 62 ms — your highest in two weeks — so recovery looks strong. A good day to push." },
  { time: "6:48", kind: "tracked", icon: "sunrise", hue: "var(--hue-energy)", title: "Woke up", detail: "7h 12m · best sleep this week" },
];

const KIND_TAG = { logged: "Logged", tracked: "Tracked" };

function ActivityLog({ onOpen }) {
  const { Badge } = window.FitVibeDesignSystem_52b6f8;
  const last = ACTIVITY.length - 1;
  return (
    <div style={{ padding: "8px 16px 10px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
      {ACTIVITY.map((a, i) => {
        const isAI = a.kind === "ai";
        const notLast = i < last;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "34px 1fr", alignItems: "start", columnGap: 12, minHeight: 54 }}>
            {/* left rail: icon over time, stacked */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
              {notLast && <span style={{ position: "absolute", top: 22, bottom: -12, left: "calc(50% - 1px)", width: 2, background: "var(--border-default)" }} />}
              {isAI ? (
                <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto", zIndex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--ai-gradient)", color: "#05131F", boxShadow: "0 0 0 4px var(--surface-card), var(--glow-ai)" }}>
                  <window.Icon name="sparkles" size={15} />
                </span>
              ) : (
                <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "0 0 auto", zIndex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${a.hue} 18%, var(--surface-card))`, color: a.hue, boxShadow: "0 0 0 4px var(--surface-card)" }}>
                  <window.Icon name={a.icon} size={15} />
                </span>
              )}
              <span style={{ position: "relative", zIndex: 1, marginTop: 6, padding: "1px 3px", borderRadius: 4, background: "var(--surface-card)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{a.time}</span>
            </div>

            {isAI ? (
              <div style={{ padding: "8px 0 12px" }}>
                <button onClick={() => onOpen && onOpen(a.id)} className="ai-card-btn" style={{
                  width: "100%", textAlign: "left", cursor: "pointer", font: "inherit",
                  padding: "11px 14px", borderRadius: "var(--radius-md)",
                  background: "var(--ai-soft)", border: "1px solid transparent",
                  backgroundImage: "linear-gradient(var(--ai-soft), var(--ai-soft)), var(--ai-gradient)",
                  backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
                  transition: "transform var(--dur-base) var(--ease-out)",
                }}>
                  <div className="fv-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-strong)", marginBottom: 6 }}>
                    <window.Icon name="sparkles" size={12} style={{ color: "var(--accent)" }} />
                    FitVibe · {a.title}
                    <window.Icon name="chevron-right" size={14} style={{ color: "var(--text-muted)", marginLeft: "auto" }} />
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.5, color: "var(--text-body)", fontWeight: 500 }}>{a.body}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--accent)" }}>
                    View full analysis
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ paddingTop: 13, paddingBottom: 13, borderBottom: notLast ? "1px solid var(--border-subtle)" : "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{a.title}</span>
                    {a.badge && <Badge hue="move">{a.badge}</Badge>}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{a.detail}</div>
                </div>
                {KIND_TAG[a.kind] && (
                  <span style={{ flex: "0 0 auto", marginTop: 2, fontSize: 10, fontWeight: 600, letterSpacing: "0.03em", color: "var(--text-faint)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <window.Icon name={a.kind === "tracked" ? "watch" : "pencil"} size={11} />
                    {KIND_TAG[a.kind]}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TodayContent({ onOpenAnalysis = () => {} }) {
  const { InsightCard, Badge } = window.FitVibeDesignSystem_52b6f8;

  return (
    <React.Fragment>
      <window.Scroll>
        <Header />

        <div style={{ marginTop: 10 }}>
          <window.HeroCarousel />
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={() => onOpenAnalysis("sleep")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", padding: 0, cursor: "pointer", font: "inherit" }}>
            <InsightCard eyebrow="FitVibe insight" title="Your recovery is trending up">
              Resting HR dropped 3&nbsp;bpm and HRV rose 12% this week — your training load looks well matched to recovery. Today's a good day for a harder session.
              <div style={{ display: "flex", gap: 7, marginTop: 13, flexWrap: "wrap" }}>
                <Badge hue="mind">HRV ▲ 12%</Badge>
                <Badge hue="heart">Resting HR ▼ 3</Badge>
              </div>
            </InsightCard>
          </button>
        </div>

        <window.SectionLabel action="All">Today's activity</window.SectionLabel>
        <ActivityLog onOpen={onOpenAnalysis} />

        <window.SectionLabel>Last night</window.SectionLabel>
        <window.SleepCard />

        <div style={{ height: 8 }} />
      </window.Scroll>
    </React.Fragment>
  );
}

Object.assign(window, { TodayContent });
