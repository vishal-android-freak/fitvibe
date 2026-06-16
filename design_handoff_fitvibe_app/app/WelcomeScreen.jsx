/* FitVibe — Welcome screen. Single welcome, then straight to Google sign-in.
   Two variants: "calm" (icon hero) and "vital" (animated rings hero).
   Exports: WelcomeScreen, Spinner. */

function Spinner({ size = 22, color = "currentColor", stroke = 2.6 }) {
  return (
    <span style={{ width: size, height: size, display: "inline-block", flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "fvSpin .8s linear infinite", display: "block" }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.22" strokeWidth={stroke} />
        <path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      </svg>
    </span>
  );
}

function PrivacyNote() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, color: "var(--text-muted)" }}>
      <window.Icon name="shield-check" size={14} />
      <span style={{ fontSize: "var(--text-xs)", lineHeight: 1.4, textAlign: "center" }}>
        Your data stays private, synced to your own device.
      </span>
    </div>
  );
}

function Legal() {
  return (
    <p style={{ fontSize: 11.5, color: "var(--text-faint)", textAlign: "center", lineHeight: 1.55, margin: "12px 18px 0" }}>
      By continuing you agree to FitVibe's <span style={{ color: "var(--text-body)", fontWeight: 600 }}>terms</span> and <span style={{ color: "var(--text-body)", fontWeight: 600 }}>privacy policy</span>.
    </p>
  );
}

/* ---------- Variant A: calm icon hero ---------- */
function WelcomeCalm({ onGoogle, busy }) {
  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 54, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <div className="fv-rise" style={{ animationDelay: "40ms" }}>
          <img src="assets/app-icon.svg" width="96" height="96" alt="FitVibe"
            style={{ borderRadius: 26, boxShadow: "var(--glow-ai)", marginBottom: 28 }} />
        </div>
        <h1 className="fv-rise" style={{ animationDelay: "120ms", fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", lineHeight: 1.12, letterSpacing: "var(--tracking-tight)", margin: "0 0 14px", color: "var(--text-strong)" }}>
          Your data, finally<br />making sense.
        </h1>
        <p className="fv-rise" style={{ animationDelay: "200ms", fontSize: "var(--text-md)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: 308, margin: 0 }}>
          FitVibe brings your Fitbit and Google&nbsp;Health data to life — with insights you can actually understand, and an AI you can ask anything.
        </p>
      </div>
      <div className="fv-rise" style={{ animationDelay: "300ms", padding: "0 24px 32px" }}>
        <window.GoogleButton onClick={onGoogle} busy={busy} />
        <PrivacyNote />
        <Legal />
      </div>
    </div>
  );
}

/* ---------- Variant B: vital animated-rings hero ---------- */
function WelcomeVital({ onGoogle, busy }) {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const [fill, setFill] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setFill(true), 200);
    return () => clearTimeout(t);
  }, []);
  const rings = [
    { value: fill ? 0.82 : 0, hue: "var(--hue-move)" },
    { value: fill ? 0.64 : 0, hue: "var(--hue-oxygen)" },
    { value: fill ? 0.47 : 0, hue: "var(--hue-heart)" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 54, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", textAlign: "center" }}>
        <img className="fv-rise" src="assets/logo-wordmark.svg" height="30" alt="FitVibe"
          style={{ animationDelay: "40ms", height: 30, marginBottom: 34, opacity: .96 }} />
        <div className="fv-pop" style={{ animationDelay: "120ms", position: "relative", marginBottom: 36 }}>
          <ProgressRing rings={rings} size={216} style={{ filter: "drop-shadow(0 0 24px rgba(74,222,128,.25))" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="fv-eyebrow" style={{ color: "var(--text-faint)", marginBottom: 4 }}>your day</span>
            <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: "var(--text-strong)" }}>82<span style={{ fontSize: 22, color: "var(--text-muted)" }}>%</span></span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>move goal</span>
          </div>
        </div>
        <h1 className="fv-rise" style={{ animationDelay: "240ms", fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", lineHeight: 1.16, letterSpacing: "var(--tracking-tight)", margin: "0 0 12px", color: "var(--text-strong)" }}>
          Every heartbeat,<br />beautifully understood.
        </h1>
        <p className="fv-rise" style={{ animationDelay: "320ms", fontSize: "var(--text-base)", color: "var(--text-secondary)", lineHeight: "var(--leading-relaxed)", maxWidth: 300, margin: 0 }}>
          Connect Google&nbsp;Health and watch your metrics turn into insights you can act on.
        </p>
      </div>
      <div className="fv-rise" style={{ animationDelay: "400ms", padding: "0 24px 32px" }}>
        <window.GoogleButton onClick={onGoogle} busy={busy} />
        <PrivacyNote />
        <Legal />
      </div>
    </div>
  );
}

function WelcomeScreen({ variant = "calm", onGoogle, busy }) {
  return variant === "vital"
    ? <WelcomeVital onGoogle={onGoogle} busy={busy} />
    : <WelcomeCalm onGoogle={onGoogle} busy={busy} />;
}

Object.assign(window, { WelcomeScreen, Spinner });
