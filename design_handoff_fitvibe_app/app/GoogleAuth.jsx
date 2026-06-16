/* FitVibe — Google OAuth handoff: neutral account picker + scopes consent.
   Styled as a clean, neutral system sheet (NOT a pixel-clone of Google's UI).
   Exports: GMark, GoogleButton, GoogleAuthSheet. */

/* ---- Generic multi-color "G" stand-in mark (our own composition) ---- */
function GMark({ size = 22 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flex: "0 0 auto",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "conic-gradient(from -45deg, #4285F4 0deg 90deg, #EA4335 90deg 180deg, #FBBC05 180deg 270deg, #34A853 270deg 360deg)",
      WebkitMask: "radial-gradient(circle at center, transparent 0 38%, #000 39%)",
      mask: "radial-gradient(circle at center, transparent 0 38%, #000 39%)",
      position: "relative",
    }}>
      <span style={{
        position: "absolute", inset: "50% 0 0 50%", width: "52%", height: "16%",
        transform: "translate(-2%, -50%)", background: "#fff",
      }} />
    </span>
  );
}

/* The white "Continue with Google" trigger shown on FitVibe's dark welcome. */
function GoogleButton({ onClick, label = "Continue with Google", busy = false }) {
  const [press, setPress] = React.useState(false);
  return (
    <button onClick={onClick} disabled={busy} style={{
      width: "100%", height: 56, borderRadius: "var(--radius-pill)", border: "none",
      background: "#FFFFFF", color: "#1F2024", cursor: busy ? "default" : "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 12,
      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "var(--text-md)",
      letterSpacing: "-0.01em", boxShadow: "0 8px 30px -10px rgba(0,0,0,.5)",
      transform: press ? "scale(.97)" : "scale(1)",
      transition: "transform var(--dur-fast) var(--ease-out)", opacity: busy ? .7 : 1,
    }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} onMouseLeave={() => setPress(false)}>
      {busy
        ? <window.Spinner size={20} color="#1F2024" />
        : <GMark size={22} />}
      <span>{busy ? "Opening Google\u2026" : label}</span>
    </button>
  );
}

/* ---- Neutral light palette for the Google sheet ---- */
const G = {
  bg: "#FFFFFF", text: "#202327", sub: "#5B616B", faint: "#737A82",
  border: "#E5E7EB", field: "#F1F3F5", fieldHover: "#E9ECEF",
  blue: "#2B6CEA", blueText: "#1B62D6",
};

const SCOPES = [
  { id: "heart", icon: "heart", hue: "#FF5C7A", label: "Heart rate & HRV",
    desc: "Resting heart rate, live heart rate, and variability", required: true },
  { id: "sleep", icon: "moon", hue: "#888CF9", label: "Sleep stages",
    desc: "Sleep duration, stages, and schedule" },
  { id: "steps", icon: "footprints", hue: "#4ADE80", label: "Steps & distance",
    desc: "Daily steps, distance, and floors climbed" },
  { id: "energy", icon: "flame", hue: "#FFB020", label: "Activity & energy",
    desc: "Active zone minutes and calories burned" },
  { id: "oxygen", icon: "wind", hue: "#38E0D8", label: "SpO\u2082 & respiratory",
    desc: "Blood oxygen and breathing rate" },
  { id: "weight", icon: "scale", hue: "#60A5FA", label: "Weight & body composition",
    desc: "Weight, BMI, and body-fat trends" },
  { id: "nutrition", icon: "utensils", hue: "#FF844C", label: "Nutrition & hydration",
    desc: "Meals, macros, and water intake" },
];

const GROUPS = [
  { title: "Heart & vitals", ids: ["heart", "oxygen"] },
  { title: "Activity", ids: ["steps", "energy"] },
  { title: "Body composition", ids: ["weight"] },
  { title: "Nutrition", ids: ["nutrition", "sleep"] },
];

const ACCOUNTS = [
  { name: "Maya Okonkwo", email: "maya.okonkwo@gmail.com", hue: "linear-gradient(135deg,#4ADE80,#38E0D8)" },
  { name: "Maya O. (work)", email: "maya@northfieldlabs.com", hue: "linear-gradient(135deg,#60A5FA,#888CF9)" },
];

/* Avatar with initials over a gradient. */
function GAvatar({ name, hue, size = 40 }) {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", flex: "0 0 auto",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: hue, color: "#fff", fontWeight: 700, fontSize: size * 0.4,
      fontFamily: "var(--font-display)",
    }}>{initials}</span>
  );
}

/* Rounded checkbox toggle. */
function GCheck({ on, onClick, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} aria-pressed={on} disabled={disabled} style={{
      width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, cursor: disabled ? "default" : "pointer",
      border: on ? "none" : `2px solid ${G.border}`,
      background: on ? G.blue : "#fff", color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      transition: "background var(--dur-base) var(--ease-out), border-color var(--dur-base)",
      opacity: disabled ? 0.6 : 1,
    }}>
      {on && <window.Icon name="check" size={16} stroke={3} />}
    </button>
  );
}

/* Top neutral browser/URL bar — signals a real OAuth handoff. */
function URLBar({ onClose }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px",
      borderBottom: `1px solid ${G.border}`,
    }}>
      <button onClick={onClose} aria-label="Close" style={{
        width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent",
        color: G.sub, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}><window.Icon name="x" size={20} /></button>
      <div style={{
        flex: 1, height: 34, borderRadius: 999, background: G.field, display: "flex",
        alignItems: "center", justifyContent: "center", gap: 7, color: G.faint, fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}>
        <window.Icon name="lock" size={13} />
        <span>accounts.google.com</span>
      </div>
      <span style={{ width: 30 }} />
    </div>
  );
}

function ScopeRow({ s, on, toggle }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 0" }}>
      <span style={{
        width: 38, height: 38, borderRadius: 11, flex: "0 0 auto", marginTop: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: s.hue + "1F", color: s.hue,
      }}><window.Icon name={s.icon} size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: G.text, lineHeight: 1.3 }}>{s.label}</div>
        <div style={{ fontSize: 13, color: G.faint, lineHeight: 1.4, marginTop: 2 }}>{s.desc}</div>
        {s.required && <div style={{ fontSize: 11.5, color: G.faint, marginTop: 4, fontWeight: 600 }}>Required to set up FitVibe</div>}
      </div>
      <div style={{ marginTop: 6 }}>
        <GCheck on={on} disabled={s.required} onClick={toggle} />
      </div>
    </div>
  );
}

/* ============================================================
   The full Google handoff sheet: account picker → consent.
   ============================================================ */
function GoogleAuthSheet({ consentLayout = "checklist", onCancel, onAllow }) {
  const [sub, setSub] = React.useState("account"); // account | consent
  const [account, setAccount] = React.useState(null);
  const [granted, setGranted] = React.useState(() => {
    const o = {}; SCOPES.forEach((s) => (o[s.id] = true)); return o;
  });
  const toggle = (id) => setGranted((g) => ({ ...g, [id]: !g[id] }));
  const chooseAccount = (a) => { setAccount(a); setSub("consent"); };
  const grantedCount = SCOPES.filter((s) => granted[s.id]).length;

  return (
    <div style={{
      position: "absolute", inset: 0, background: G.bg, color: G.text,
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans)", borderRadius: 44, overflow: "hidden",
    }}>
      <URLBar onClose={onCancel} />

      {sub === "account" ? (
        <div key="acct" className="g-fade" style={{ flex: 1, overflowY: "auto", padding: "26px 26px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
            <GMark size={22} />
            <span style={{ fontSize: 15, fontWeight: 600, color: G.sub }}>Sign in with Google</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", color: G.text }}>Choose an account</h1>
          <p style={{ fontSize: 15, color: G.sub, margin: "0 0 20px" }}>to continue to <span style={{ color: G.text, fontWeight: 600 }}>FitVibe</span></p>

          <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${G.border}`, borderRadius: 16, overflow: "hidden" }}>
            {ACCOUNTS.map((a, i) => (
              <button key={a.email} onClick={() => chooseAccount(a)} className="g-row" style={{
                display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", border: "none",
                borderTop: i ? `1px solid ${G.border}` : "none", background: "transparent",
                cursor: "pointer", textAlign: "left", width: "100%",
              }}>
                <GAvatar name={a.name} hue={a.hue} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: G.text }}>{a.name}</span>
                  <span style={{ display: "block", fontSize: 13, color: G.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.email}</span>
                </span>
              </button>
            ))}
            <button onClick={() => chooseAccount(ACCOUNTS[0])} className="g-row" style={{
              display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", border: "none",
              borderTop: `1px solid ${G.border}`, background: "transparent", cursor: "pointer", textAlign: "left", width: "100%",
            }}>
              <span style={{ width: 40, height: 40, borderRadius: "50%", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: G.field, color: G.sub }}>
                <window.Icon name="user-plus" size={20} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: G.text }}>Use another account</span>
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: G.faint, lineHeight: 1.55, margin: "22px 2px 0" }}>
            To continue, Google will share your name, email address, and profile picture with FitVibe. Before using this app, review its <span style={{ color: G.blueText, fontWeight: 600 }}>privacy policy</span> and <span style={{ color: G.blueText, fontWeight: 600 }}>terms of service</span>.
          </p>
        </div>
      ) : (
        <ConsentView
          layout={consentLayout} account={account} granted={granted} toggle={toggle}
          grantedCount={grantedCount}
          onBack={() => setSub("account")}
          onCancel={onCancel}
          onAllow={() => onAllow(account, SCOPES.filter((s) => granted[s.id]))}
          G={G}
        />
      )}
    </div>
  );
}

function ConsentView({ layout, account, granted, toggle, grantedCount, onBack, onCancel, onAllow, G }) {
  const byId = Object.fromEntries(SCOPES.map((s) => [s.id, s]));
  return (
    <React.Fragment>
      <div key="consent" className="g-fade" style={{ flex: 1, overflowY: "auto", padding: "24px 26px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
          <GMark size={22} />
          <span style={{ fontSize: 15, fontWeight: 600, color: G.sub }}>Sign in with Google</span>
        </div>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.25, color: G.text }}>
          FitVibe wants to access your Google&nbsp;Health data
        </h1>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 14px 7px 8px", borderRadius: 999, border: `1px solid ${G.border}`, marginBottom: 22 }}>
          <GAvatar name={account.name} hue={account.hue} size={26} />
          <span style={{ fontSize: 13.5, color: G.sub, fontWeight: 500 }}>{account.email}</span>
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, color: G.text, margin: "0 0 4px" }}>This will let FitVibe:</p>

        {layout === "grouped" ? (
          GROUPS.map((grp) => (
            <div key={grp.title} style={{ marginTop: 14 }}>
              <div className="g-eyebrow" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: G.faint, margin: "0 0 2px" }}>{grp.title}</div>
              {grp.ids.map((id) => (
                <ScopeRow key={id} s={byId[id]} on={granted[id]} toggle={() => toggle(id)} />
              ))}
            </div>
          ))
        ) : (
          <div style={{ marginTop: 6 }}>
            {SCOPES.map((s) => (
              <ScopeRow key={s.id} s={s} on={granted[s.id]} toggle={() => toggle(s.id)} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "14px 0 4px", marginTop: 8, borderTop: `1px solid ${G.border}`, color: G.faint }}>
          <window.Icon name="info" size={16} style={{ marginTop: 2, flex: "0 0 auto" }} />
          <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
            Make sure you trust FitVibe. You can see or remove access any time in your <span style={{ color: G.blueText, fontWeight: 600 }}>Google Account</span>. FitVibe's use of your data is governed by its <span style={{ color: G.blueText, fontWeight: 600 }}>privacy policy</span>. This is not medical advice.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px 20px", borderTop: `1px solid ${G.border}`, background: "#fff" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: G.blueText, fontWeight: 700, fontSize: 15, cursor: "pointer", padding: "10px 8px", fontFamily: "var(--font-sans)" }}>Cancel</button>
        <button onClick={onAllow} style={{
          height: 46, padding: "0 26px", borderRadius: 999, border: "none", background: G.blue, color: "#fff",
          fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "var(--font-sans)",
          boxShadow: "0 8px 22px -10px rgba(43,108,234,.8)",
        }}>Allow{grantedCount < SCOPES.length ? ` (${grantedCount})` : ""}</button>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { GMark, GoogleButton, GoogleAuthSheet, GA_SCOPES: SCOPES });
