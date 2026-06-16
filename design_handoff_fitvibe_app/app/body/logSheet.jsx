/* FitVibe — Body logging: floating + button, the action menu, and per-kind
   "log" sheets (food / workout / walk / water / weight). Sheets look complete
   but confirm without mutating the screen.
   Exports: LogFab, LogMenu, LogSheet. */

const LOG_ACTIONS = [
  { id: "food", icon: "utensils", hue: "var(--hue-nutrition)", label: "Log food" },
  { id: "workout", icon: "dumbbell", hue: "var(--hue-move)", label: "Log workout" },
  { id: "walk", icon: "footprints", hue: "var(--hue-oxygen)", label: "Log a walk" },
  { id: "water", icon: "glass-water", hue: "var(--hue-hydration)", label: "Log water" },
  { id: "weight", icon: "scale", hue: "var(--sky-400)", label: "Log weight" },
];

function LogFab({ open, onClick }) {
  return (
    <button onClick={onClick} aria-label={open ? "Close log menu" : "Log something"} style={{
      position: "absolute", right: 18, bottom: 100, zIndex: 48, width: 58, height: 58,
      borderRadius: "var(--radius-pill)", border: "none", background: "var(--ai-gradient)", color: "#05131F",
      cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "var(--glow-ai), var(--shadow-lg)",
      transition: "transform var(--dur-base) var(--ease-spring)",
      transform: open ? "rotate(135deg)" : "rotate(0deg)",
    }}>
      <window.Icon name="plus" size={28} stroke={2.4} />
    </button>
  );
}

function LogMenu({ open, onClose, onPick }) {
  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, zIndex: 46, background: "rgba(3,5,9,.5)",
        backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity var(--dur-base) var(--ease-out)",
      }} />
      <div style={{
        position: "absolute", right: 18, bottom: 170, zIndex: 47, display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 12, pointerEvents: open ? "auto" : "none",
      }}>
        {LOG_ACTIONS.map((a, i) => (
          <button key={a.id} onClick={() => onPick(a.id)} className="log-action" style={{
            display: "inline-flex", alignItems: "center", gap: 12, padding: "9px 16px 9px 9px",
            borderRadius: "var(--radius-pill)", border: "1px solid var(--border-subtle)",
            background: "var(--surface-overlay)", cursor: "pointer", fontFamily: "var(--font-sans)",
            boxShadow: "var(--shadow-md)",
            opacity: open ? 1 : 0, transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(.9)",
            transition: `opacity var(--dur-base) var(--ease-out) ${open ? i * 40 : 0}ms, transform var(--dur-base) var(--ease-spring) ${open ? i * 40 : 0}ms`,
          }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${a.hue} 18%, transparent)`, color: a.hue }}>
              <window.Icon name={a.icon} size={19} />
            </span>
            <span style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-strong)" }}>{a.label}</span>
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ── small reusable bits ── */
function Stepper({ value, setValue, step = 1, suffix = "", min = 0, fixed = 0 }) {
  const btn = (dir) => (
    <button onClick={() => setValue(Math.max(min, +(value + dir * step).toFixed(2)))} aria-label={dir > 0 ? "Increase" : "Decrease"} style={{
      width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
      color: "var(--text-strong)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
    }}><window.Icon name={dir > 0 ? "plus" : "minus"} size={20} /></button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
      {btn(-1)}
      <div style={{ minWidth: 120, textAlign: "center" }}>
        <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-3xl)", color: "var(--text-strong)" }}>{value.toFixed(fixed)}</span>
        <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", fontWeight: 600, marginLeft: 4 }}>{suffix}</span>
      </div>
      {btn(1)}
    </div>
  );
}

function SegChips({ options, value, setValue }) {
  const { Chip } = window.FitVibeDesignSystem_52b6f8;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => (
        <span key={o} onClick={() => setValue(o)} style={{ cursor: "pointer" }}>
          <Chip selected={value === o}>{o}</Chip>
        </span>
      ))}
    </div>
  );
}

function SheetField({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );
}

/* ── per-kind sheet bodies ── */
function FoodBody({ s }) {
  const meals = ["Breakfast", "Lunch", "Dinner", "Snack"];
  const h = new Date().getHours();
  const [meal, setMeal] = React.useState(h < 11 ? "Breakfast" : h < 15 ? "Lunch" : h < 20 ? "Dinner" : "Snack");
  const common = [
    { n: "Oatmeal with berries", kcal: 220 }, { n: "Greek yogurt", kcal: 120 },
    { n: "Banana", kcal: 105 }, { n: "Grilled chicken salad", kcal: 340 }, { n: "Almonds (28g)", kcal: 164 },
  ];
  const [added, setAdded] = React.useState({});
  return (
    <React.Fragment>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 16px", borderRadius: "var(--radius-pill)", background: "var(--surface-card)", border: "1px solid var(--border-strong)", marginBottom: 18 }}>
        <window.Icon name="search" size={18} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: "var(--text-md)", color: "var(--text-faint)" }}>Search foods…</span>
      </div>
      <SheetField label="Meal"><SegChips options={meals} value={meal} setValue={setMeal} /></SheetField>
      <SheetField label="Common foods">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {common.map((c) => (
            <button key={c.n} onClick={() => setAdded((a) => ({ ...a, [c.n]: !a[c.n] }))} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: "var(--radius-md)",
              background: "var(--surface-card)", border: "1px solid " + (added[c.n] ? "var(--accent)" : "var(--border-subtle)"),
              cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "var(--font-sans)",
            }}>
              <span style={{ flex: 1, fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-body)" }}>{c.n}</span>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{c.kcal} kcal</span>
              <span style={{ color: added[c.n] ? "var(--accent)" : "var(--text-faint)" }}>
                <window.Icon name={added[c.n] ? "check-circle-2" : "plus-circle"} size={22} />
              </span>
            </button>
          ))}
        </div>
      </SheetField>
    </React.Fragment>
  );
}

function WorkoutBody() {
  const types = [
    { id: "Run", icon: "footprints" }, { id: "Strength", icon: "dumbbell" }, { id: "Cycling", icon: "bike" },
    { id: "Yoga", icon: "flower-2" }, { id: "HIIT", icon: "zap" }, { id: "Swim", icon: "waves" },
  ];
  const [type, setType] = React.useState("Run");
  const [mins, setMins] = React.useState(30);
  const [intensity, setIntensity] = React.useState("Moderate");
  return (
    <React.Fragment>
      <SheetField label="Type">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {types.map((t) => {
            const on = type === t.id;
            return (
              <button key={t.id} onClick={() => setType(t.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 6px",
                borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)",
                background: on ? "var(--accent-soft)" : "var(--surface-card)",
                border: "1px solid " + (on ? "var(--accent)" : "var(--border-subtle)"),
                color: on ? "var(--accent)" : "var(--text-body)",
              }}>
                <window.Icon name={t.icon} size={22} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{t.id}</span>
              </button>
            );
          })}
        </div>
      </SheetField>
      <SheetField label="Duration"><Stepper value={mins} setValue={setMins} step={5} suffix="min" /></SheetField>
      <SheetField label="Intensity"><SegChips options={["Easy", "Moderate", "Hard"]} value={intensity} setValue={setIntensity} /></SheetField>
    </React.Fragment>
  );
}

function WalkBody() {
  const [km, setKm] = React.useState(1.5);
  const [mins, setMins] = React.useState(20);
  return (
    <React.Fragment>
      <SheetField label="Distance"><Stepper value={km} setValue={setKm} step={0.1} suffix="km" fixed={1} /></SheetField>
      <SheetField label="Duration"><Stepper value={mins} setValue={setMins} step={5} suffix="min" /></SheetField>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline)" }}>
        <window.Icon name="clock" size={17} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: 600 }}>Now · just finished</span>
      </div>
    </React.Fragment>
  );
}

function WaterBody() {
  const goal = 2.5;
  const [ml, setMl] = React.useState(1600);
  const glasses = 8, per = (goal * 1000) / glasses;
  const filled = Math.round(ml / per);
  return (
    <React.Fragment>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-3xl)", color: "var(--text-strong)" }}>{(ml / 1000).toFixed(2)}</span>
        <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", fontWeight: 600 }}> / {goal} L</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 20 }}>
        {Array.from({ length: glasses }).map((_, i) => (
          <span key={i} style={{ color: i < filled ? "var(--hue-hydration)" : "var(--border-strong)" }}>
            <window.Icon name="glass-water" size={22} />
          </span>
        ))}
      </div>
      <SheetField label="Quick add">
        <div style={{ display: "flex", gap: 8 }}>
          {[250, 500, 750].map((amt) => (
            <button key={amt} onClick={() => setMl((m) => Math.min(goal * 1000, m + amt))} style={{
              flex: 1, height: 48, borderRadius: "var(--radius-md)", border: "1px solid var(--border-strong)",
              background: "var(--surface-card)", color: "var(--text-strong)", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "var(--text-md)",
            }}>+{amt} ml</button>
          ))}
        </div>
      </SheetField>
    </React.Fragment>
  );
}

function WeightBody() {
  const [kg, setKg] = React.useState(68.4);
  return (
    <React.Fragment>
      <SheetField label="Weight"><Stepper value={kg} setValue={setKg} step={0.1} suffix="kg" fixed={1} min={20} /></SheetField>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline)" }}>
        <window.Icon name="trending-down" size={17} style={{ color: "var(--positive)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: 600 }}>0.7 kg below last week</span>
      </div>
    </React.Fragment>
  );
}

const SHEET_META = {
  food: { title: "Log food", confirm: "Add to log", hue: "var(--hue-nutrition)", Body: FoodBody, done: "Food added to today's log" },
  workout: { title: "Log workout", confirm: "Save workout", hue: "var(--hue-move)", Body: WorkoutBody, done: "Workout saved" },
  walk: { title: "Log a walk", confirm: "Save walk", hue: "var(--hue-oxygen)", Body: WalkBody, done: "Walk saved" },
  water: { title: "Log water", confirm: "Add water", hue: "var(--hue-hydration)", Body: WaterBody, done: "Water logged" },
  weight: { title: "Log weight", confirm: "Save weight", hue: "var(--sky-400)", Body: WeightBody, done: "Weight saved" },
};

function LogSheet({ kind, onClose, onConfirm }) {
  const { Button } = window.FitVibeDesignSystem_52b6f8;
  const meta = kind ? SHEET_META[kind] : null;
  const open = !!kind;
  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, zIndex: 80, background: "rgba(3,5,9,.6)", backdropFilter: "blur(2px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity var(--dur-base) var(--ease-out)",
      }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 81, maxHeight: "86%",
        background: "var(--surface-overlay)", borderRadius: "28px 28px 0 0", boxShadow: "var(--shadow-xl)",
        borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column",
        transform: open ? "translateY(0)" : "translateY(101%)", transition: "transform var(--dur-slow) var(--ease-out)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
          <span style={{ width: 40, height: 5, borderRadius: 999, background: "var(--border-strong)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            {meta && <span style={{ width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${meta.hue} 18%, transparent)`, color: meta.hue }}><window.Icon name={LOG_ACTIONS.find((a) => a.id === kind)?.icon || "plus"} size={18} /></span>}
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: "var(--text-strong)" }}>{meta?.title}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", color: "var(--text-strong)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <window.Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 8px" }}>
          {meta && <meta.Body />}
        </div>
        <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <Button variant="ai" size="lg" block onClick={() => onConfirm(meta?.done)}>{meta?.confirm}</Button>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { LogFab, LogMenu, LogSheet });
