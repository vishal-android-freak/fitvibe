/* FitVibe — onboarding flow state machine.
   welcome → google (account → consent) → connecting → success.
   Rendered inside <PhoneFrame>. */

function Toast({ children, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, []);
  return (
    <div className="fv-toast" style={{
      position: "absolute", left: 18, right: 18, bottom: 26, zIndex: 60,
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

function OnboardingFlow({ welcomeVariant = "calm", consentLayout = "checklist" }) {
  const [phase, setPhase] = React.useState("welcome"); // welcome | google | connecting | success
  const [busy, setBusy] = React.useState(false);
  const [account, setAccount] = React.useState(null);
  const [scopes, setScopes] = React.useState([]);
  const [toast, setToast] = React.useState(false);

  const openGoogle = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); setPhase("google"); }, 620);
  };
  const cancelGoogle = () => setPhase("welcome");
  const allow = (acct, granted) => { setAccount(acct); setScopes(granted); setPhase("connecting"); };
  const replay = () => { setPhase("welcome"); setAccount(null); setScopes([]); };

  return (
    <React.Fragment>
      {phase !== "google" && <window.StatusBar />}

      {phase === "welcome" && (
        <div className="fv-screen" key={"w-" + welcomeVariant} style={{ position: "absolute", inset: 0 }}>
          <window.WelcomeScreen variant={welcomeVariant} onGoogle={openGoogle} busy={busy} />
        </div>
      )}

      {phase === "connecting" && (
        <div className="fv-screen" key="c" style={{ position: "absolute", inset: 0 }}>
          <window.ConnectingScreen scopes={scopes} onDone={() => setPhase("success")} />
        </div>
      )}

      {phase === "success" && (
        <div className="fv-screen" key="s" style={{ position: "absolute", inset: 0 }}>
          <window.SuccessScreen account={account} scopeCount={scopes.length || 7}
            onEnter={() => setToast(true)} onReplay={replay} />
        </div>
      )}

      {phase === "google" && (
        <React.Fragment>
          {/* dimmed welcome behind the handoff sheet */}
          <div style={{ position: "absolute", inset: 0 }}>
            <window.WelcomeScreen variant={welcomeVariant} onGoogle={() => {}} busy={true} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "rgba(3,5,9,.55)", backdropFilter: "blur(2px)" }} />
          <div className="g-sheet" key="g" style={{ position: "absolute", inset: 0, zIndex: 50 }}>
            <window.GoogleAuthSheet consentLayout={consentLayout} onCancel={cancelGoogle} onAllow={allow} />
          </div>
        </React.Fragment>
      )}

      {toast && (
        <Toast onClose={() => setToast(false)}>
          The Today dashboard is next on the build list — we're shipping FitVibe screen by screen.
        </Toast>
      )}
    </React.Fragment>
  );
}

Object.assign(window, { OnboardingFlow });
