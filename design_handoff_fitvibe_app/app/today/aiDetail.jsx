/* FitVibe — AI analysis detail (rich expanded view) + Ask FitVibe conversation.
   Tapping an AI card in the activity feed opens AIAnalysisDetail; tapping a
   smart-reply chip navigates to AskConversation.
   Exports: AIAnalysisDetail, AskConversation. */

function B({ children }) {
  return <strong style={{ color: "var(--text-strong)", fontWeight: 700 }}>{children}</strong>;
}

/* ---- analysis content ---- */
const ANALYSES = {
  sleep: {
    time: "6:52 am",
    headline: "Your recovery is strong, but your bedtime is drifting later",
    body: (
      <React.Fragment>
        You slept <B>7h 12m</B> with <B>deep sleep up 18%</B> versus last week, and your <B>HRV hit 62 ms</B> — the highest in two weeks. The catch: a late evening pushed lights-out to <B>12:10 AM</B>, trimming your final REM cycle to just <B>29 minutes</B>.
      </React.Fragment>
    ),
    bullets: [
      <React.Fragment>Aim for lights-out by <B>11:15 PM</B> tonight to win back the REM you missed.</React.Fragment>,
      <React.Fragment>Your resting heart rate is back in range, so a moderate session today is fine — just skip intervals while your cough lingers.</React.Fragment>,
      <React.Fragment>Keep hydration near your <B>3 L</B> goal to help the meds clear; you ran ~0.9 L short over the weekend.</React.Fragment>,
    ],
    question: "Is that warmth in your forehead still there this morning, or has it cleared?",
    replies: ["Still a bit warm", "Feeling clearer", "Cough is worse"],
    gen: "sleep",
  },
  run: {
    time: "7:38 am",
    headline: "Solid zone 2 run — your aerobic base is building",
    body: (
      <React.Fragment>
        Your <B>5.2 km</B> run held <B>zone 2</B> for 24 of 28 minutes, with heart rate drifting up just <B>4 bpm</B> at a steady <B>5:19 /km</B> pace. That's textbook aerobic work, and it lines up with your <B>VO₂ max ticking to 44</B>.
      </React.Fragment>
    ),
    bullets: [
      <React.Fragment>Keep tomorrow easy or rest — back-to-back hard days blunt the adaptation.</React.Fragment>,
      <React.Fragment>Your cough is still hanging on, so hold off on the trainer until it clears.</React.Fragment>,
      <React.Fragment>Refuel with protein in the next hour to speed recovery.</React.Fragment>,
    ],
    question: "Want me to plan this week's runs around your recovery?",
    replies: ["Plan my week", "How's my VO₂ max?", "Why keep it easy?"],
    gen: "run",
  },
};

function ReplyChip({ children, icon, onClick }) {
  const [press, setPress] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: "var(--radius-pill)",
        border: "1px solid var(--border-strong)", background: press ? "var(--accent-soft)" : "transparent",
        color: "var(--text-body)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "var(--text-sm)",
        cursor: "pointer", transition: "background var(--dur-fast), transform var(--dur-fast)",
        transform: press ? "scale(.97)" : "scale(1)", whiteSpace: "nowrap",
      }}>
      {icon && <window.Icon name={icon} size={15} />}
      {children}
    </button>
  );
}

function TopBar({ title, onClose, onBack }) {
  return (
    <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 10px", borderBottom: "1px solid var(--border-subtle)", background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))" }}>
      <button onClick={onBack || onClose} aria-label="Back" style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-strong)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <window.Icon name={onBack ? "chevron-left" : "x"} size={22} />
      </button>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ai-gradient)", color: "#05131F", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <window.Icon name="sparkles" size={13} />
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)" }}>{title}</span>
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-strong)", margin: "22px 0 12px" }}>{children}</div>;
}

function GenBlocks({ gen }) {
  if (gen === "sleep") {
    return (
      <React.Fragment>
        <SectionLabel>Here's how you slept</SectionLabel>
        <window.SleepDurationCard duration="7h 12m" score={84} rating="Good" />
        <div style={{ marginTop: 12 }}><window.SleepCard /></div>
        <SectionLabel>Your recovery signals</SectionLabel>
        <window.RecoverySignals />
      </React.Fragment>
    );
  }
  return (
    <React.Fragment>
      <SectionLabel>This week's training load</SectionLabel>
      <window.TrainingLoad />
      <SectionLabel>Your recovery signals</SectionLabel>
      <window.RecoverySignals />
    </React.Fragment>
  );
}

function Feedback() {
  const [vote, setVote] = React.useState(null);
  const btn = (v, icon) => (
    <button onClick={() => setVote(vote === v ? null : v)} aria-label={v} style={{
      width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
      background: vote === v ? "var(--accent-soft)" : "transparent",
      color: vote === v ? "var(--accent)" : "var(--text-muted)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}><window.Icon name={icon} size={18} /></button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", gap: 4 }}>{btn("up", "thumbs-up")}{btn("down", "thumbs-down")}</div>
      <button aria-label="More" style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <window.Icon name="ellipsis-vertical" size={18} />
      </button>
    </div>
  );
}

function AIAnalysisDetail({ analysis = "sleep", onClose, onContinue }) {
  const a = ANALYSES[analysis] || ANALYSES.sleep;
  return (
    <div className="screen-push" style={{ position: "absolute", inset: 0, zIndex: 60, background: "var(--bg-app)", backgroundImage: "var(--field-glow)", display: "flex", flexDirection: "column", borderRadius: 44, overflow: "hidden" }}>
      <TopBar title="FitVibe" onClose={onClose} />

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 16px" }}>
        {/* AI message */}
        <div className="fv-eyebrow" style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-muted)", marginBottom: 12 }}>
          <window.Icon name="sparkles" size={13} style={{ color: "var(--accent)" }} />
          FitVibe · {a.time}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", lineHeight: 1.2, letterSpacing: "var(--tracking-tight)", color: "var(--text-strong)", margin: "0 0 12px" }}>{a.headline}</h1>
        <p style={{ fontSize: "var(--text-md)", lineHeight: "var(--leading-relaxed)", color: "var(--text-secondary)", margin: "0 0 14px" }}>{a.body}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 0 16px" }}>
          {a.bullets.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 9, flex: "0 0 auto" }} />
              <span style={{ fontSize: "var(--text-md)", lineHeight: "var(--leading-relaxed)", color: "var(--text-secondary)" }}>{b}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "var(--text-md)", lineHeight: "var(--leading-relaxed)", color: "var(--text-body)", margin: "0 0 4px", fontWeight: 500 }}>{a.question}</p>

        {/* generative UI */}
        <GenBlocks gen={a.gen} />

        <Feedback />
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.5, marginTop: 14 }}>
          FitVibe can make mistakes and does not provide medical advice. Check important information with a clinician.
        </p>
      </div>

      {/* smart replies */}
      <div style={{ flex: "0 0 auto", padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))", WebkitBackdropFilter: "blur(var(--glass-blur))", display: "flex", gap: 9, flexWrap: "wrap" }}>
        {a.replies.map((r) => <ReplyChip key={r} onClick={() => onContinue(r, analysis)}>{r}</ReplyChip>)}
        <ReplyChip icon="reply" onClick={() => onContinue("", analysis)}>Reply</ReplyChip>
      </div>
    </div>
  );
}

/* ---- conversation ---- */
const CANNED = {
  "Still a bit warm": "Thanks for the heads-up. A low-grade warmth two days in is worth watching — keep fluids high and skip hard training today. If it tops 38°C or lasts past tomorrow, check in with a clinician. Want a gentle mobility session instead?",
  "Feeling clearer": "Good to hear. Your resting heart rate agrees — it's settled back to 54 bpm. You're clear for a moderate effort; just keep it conversational while the cough fully clears.",
  "Cough is worse": "Sorry to hear it. When symptoms are climbing, rest beats training every time. I'd take today fully off and prioritize sleep and 3 L of water. Shall I pause your training plan for 48 hours?",
  "Plan my week": "Here's a recovery-first week: easy 30 min today, rest tomorrow, then a tempo run Thursday once your cough clears. I'll keep Saturday open for a longer effort if you're feeling good.",
  "How's my VO₂ max?": "It's nudged from 42 to 44 ml/kg over the last month — steady, healthy progress. Your easy-run pace dropped ~15 s/km at the same heart rate, which is the clearest sign your aerobic engine is growing.",
  "Why keep it easy?": "Your last two sessions were hard and your HRV, while high, dipped slightly overnight. An easy day lets the adaptation from this run actually stick — pushing again now would just add fatigue without the fitness payoff.",
  "What's driving my recovery improvement?": "Two things stand out: your resting heart rate fell 3 bpm and HRV rose 12% over the week — classic signs your training load and recovery are well matched. Five nights of 7h+ sleep are doing most of the work.",
  "How are late meals affecting my deep sleep?": "On the four nights you ate after 9 PM, deep sleep averaged 22% lower than on early-dinner nights. Late digestion keeps your core temperature up, which suppresses deep sleep early in the night. Try finishing dinner about 3 hours before bed.",
  "Why was my resting heart rate elevated Thursday?": "Thursday's resting HR was 6 bpm above your baseline. It lines up with a late lights-out (12:14 AM) and lower HRV — your body was still recovering. It returned to normal by Saturday, so nothing to worry about.",
  "Should I train hard today?": "Yes — your readiness is 86, HRV is 62 ms, and your resting HR is fully recovered. Recent load has been moderate, so your body can absorb a harder session. Keep it earlier in the day to protect tonight's sleep.",
  "Why is my VO₂ max improving?": "Your VO₂ max ticked from 42 to 44 ml/kg this month. The driver is your steady zone 2 running — holding the same pace at a lower heart rate means your aerobic engine is getting more efficient.",
  "Compare my activity to last week": "You're up 18% in active zone minutes (186 vs 158) and your daily step average rose to 8,240. You also hit your move goal 6 of 7 days versus 4 last week — a strong, consistent week.",
  "Why does my hydration drop on weekends?": "Your weekday hydration averages 2.3 L, but Saturday and Sunday fall to about 1.4 L — likely a broken routine away from your desk. A couple of weekend reminders should close the gap.",
  "How's my move streak going?": "You've closed your move ring 6 days running — your longest streak this month. One more today makes it a full week.",
};
const DEFAULT_REPLY = "Got it. I'll factor that in. Based on your recent recovery, keeping today light and well-hydrated is the safe call — want me to adjust your plan?";
const FOLLOWUPS = ["Plan my week", "How's my recovery?", "Compare to last week"];

function AskConversation({ seed, onClose }) {
  const { ChatMessage } = window.FitVibeDesignSystem_52b6f8;
  const [msgs, setMsgs] = React.useState(() => seed ? [{ role: "user", text: seed }] : []);
  const [typing, setTyping] = React.useState(false);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef(null);

  const replyTo = (text) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { role: "assistant", text: CANNED[text] || DEFAULT_REPLY }]);
    }, 850);
  };

  React.useEffect(() => { if (seed) replyTo(seed); }, []);
  React.useEffect(() => {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  const send = (text) => {
    const t = (text != null ? text : input).trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    replyTo(t);
  };

  return (
    <div className="screen-push" style={{ position: "absolute", inset: 0, zIndex: 70, background: "var(--bg-app)", backgroundImage: "var(--field-glow)", display: "flex", flexDirection: "column", borderRadius: 44, overflow: "hidden" }}>
      <TopBar title="Ask FitVibe" onBack={onClose} />

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} />)}
        {typing && (
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--ai-gradient)", color: "#05131F", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
              <window.Icon name="sparkles" size={13} />
            </span>
            <span className="ask-typing" style={{ display: "inline-flex", gap: 4, padding: "13px 16px", borderRadius: "20px 20px 20px 6px", background: "var(--surface-raised)", boxShadow: "var(--ring-hairline)" }}>
              <i></i><i></i><i></i>
            </span>
          </div>
        )}
      </div>

      {/* smart followups */}
      <div style={{ flex: "0 0 auto", display: "flex", gap: 8, padding: "8px 16px 0", flexWrap: "wrap" }}>
        {FOLLOWUPS.map((f) => <ReplyChip key={f} onClick={() => send(f)}>{f}</ReplyChip>)}
      </div>

      {/* composer */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 16px" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask about your health…"
          style={{ flex: 1, height: 48, padding: "0 18px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--text-strong)", fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", outline: "none" }} />
        <button onClick={() => send()} aria-label="Send" style={{ width: 48, height: 48, flex: "0 0 auto", borderRadius: "50%", border: "none", background: "var(--ai-gradient)", color: "#05131F", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--glow-ai)" }}>
          <window.Icon name="arrow-up" size={22} stroke={2.4} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AIAnalysisDetail, AskConversation });
