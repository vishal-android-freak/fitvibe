/* FitVibe — Body sections: Vitals (full metric catalog), Nutrition, Activity.
   Exports: BodyVitals, BodyNutrition, BodyActivity. */

function Eyebrow({ children, note }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 2px 11px" }}>
      <span className="fv-eyebrow" style={{ color: "var(--text-faint)" }}>{children}</span>
      {note && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{note}</span>}
    </div>
  );
}

function Tile({ label, value, unit, hue, icon, delta, deltaDir, goal, spark }) {
  const { StatTile } = window.FitVibeDesignSystem_52b6f8;
  return (
    <StatTile label={label} value={value} unit={unit} hue={hue}
      icon={<window.Icon name={icon} size={16} />} delta={delta} deltaDir={deltaDir} goal={goal} spark={spark}
      style={{ padding: "13px 14px", gap: 7 }} />
  );
}

/* tiny ECG-ish trace */
function EcgTrace({ hue }) {
  const pts = "0,18 26,18 32,18 36,7 41,30 46,12 52,18 78,18 84,18 88,9 93,28 98,14 104,18 130,18 136,18 140,8 145,29 150,13 156,18 182,18 188,18 192,9 197,28 202,14 208,18 234,18";
  return (
    <svg viewBox="0 0 234 36" width="100%" height="36" preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={hue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px color-mix(in oklab, ${hue} 60%, transparent))` }} />
    </svg>
  );
}

function BodyVitals() {
  const { Badge } = window.FitVibeDesignSystem_52b6f8;
  return (
    <React.Fragment>
      <Eyebrow>Heart &amp; circulation</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile label="Resting HR" value="54" unit="bpm" hue="var(--hue-heart)" icon="heart" delta="3 bpm" deltaDir="down" spark={[58, 57, 57, 56, 55, 54, 54]} />
        <Tile label="HRV" value="62" unit="ms" hue="var(--hue-mind)" icon="activity" delta="12%" deltaDir="up" spark={[52, 55, 54, 58, 60, 61, 62]} />
        <Tile label="Blood pressure" value="118/76" unit="mmHg" hue="var(--hue-heart)" icon="gauge" spark={[120, 119, 121, 118, 117, 119, 118]} />
        <Tile label="VO₂ max" value="44" unit="ml/kg" hue="var(--hue-move)" icon="gauge" delta="1" deltaDir="up" spark={[42, 42, 43, 43, 43, 44, 44]} />
      </div>
      {/* ECG special row */}
      <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ color: "var(--hue-heart)" }}><window.Icon name="heart-pulse" size={18} /></span>
          <span style={{ flex: 1, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-strong)" }}>ECG · heart rhythm</span>
          <Badge tone="positive">Normal sinus</Badge>
        </div>
        <EcgTrace hue="var(--hue-heart)" />
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 8 }}>Last reading 2 days ago · 62 bpm average</div>
      </div>

      <Eyebrow>Oxygen &amp; respiration</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile label="SpO₂" value="97" unit="%" hue="var(--hue-oxygen)" icon="wind" spark={[96, 97, 96, 97, 98, 97, 97]} />
        <Tile label="Respiratory rate" value="14.2" unit="br/min" hue="var(--sky-400)" icon="wind" spark={[14.5, 14.2, 14.4, 14.1, 14.0, 14.3, 14.2]} />
      </div>

      <Eyebrow>Body</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile label="Weight" value="68.4" unit="kg" hue="var(--sky-400)" icon="scale" delta="0.7 kg" deltaDir="down" spark={[69.1, 69.0, 68.8, 68.7, 68.6, 68.5, 68.4]} />
        <Tile label="Body fat" value="22.1" unit="%" hue="var(--hue-nutrition)" icon="user" delta="0.4%" deltaDir="down" spark={[23.0, 22.8, 22.6, 22.5, 22.3, 22.2, 22.1]} />
        <Tile label="Body temp" value="36.6" unit="°C" hue="var(--hue-energy)" icon="thermometer" spark={[36.5, 36.6, 36.7, 36.6, 36.5, 36.6, 36.6]} />
        <Tile label="Blood glucose" value="5.4" unit="mmol/L" hue="var(--hue-mind)" icon="droplet" spark={[5.6, 5.5, 5.7, 5.4, 5.3, 5.5, 5.4]} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, color: "var(--text-faint)" }}>
        <window.Icon name="info" size={14} style={{ marginTop: 2, flex: "0 0 auto" }} />
        <p style={{ fontSize: "var(--text-xs)", lineHeight: 1.5, margin: 0 }}>
          ECG, blood pressure and glucose readings are for wellness tracking only and are not medical advice.
        </p>
      </div>
    </React.Fragment>
  );
}

/* ── Nutrition ── */
function MacroRing({ label, value, goal, hue }) {
  const { ProgressRing } = window.FitVibeDesignSystem_52b6f8;
  const [v, setV] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setV(value / goal), 150); return () => clearTimeout(t); }, [value, goal]);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <ProgressRing value={v} hue={hue} size={84} thickness={9} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)", lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 9.5, color: "var(--text-faint)", fontWeight: 600 }}>/{goal}g</span>
        </div>
      </div>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-body)", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function MicroBar({ label, value, goal, unit, hue }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 86px", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", fontWeight: 600 }}>{label}</span>
      <div style={{ height: 6, borderRadius: 999, background: "var(--ring-track)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 999, background: hue, opacity: 0.9 }} />
      </div>
      <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>{value.toLocaleString()}</span>/{goal.toLocaleString()} {unit}
      </span>
    </div>
  );
}

function BodyNutrition() {
  const goal = 2050, food = 1438, exercise = 612;
  const remaining = goal - food + exercise;
  const meals = [
    { meal: "Breakfast", item: "Oatmeal, berries & coffee", time: "8:10a", kcal: 320, icon: "sunrise" },
    { meal: "Lunch", item: "Grilled chicken salad", time: "1:05p", kcal: 540, icon: "sun" },
    { meal: "Snack", item: "Greek yogurt & almonds", time: "4:00p", kcal: 284, icon: "cookie" },
    { meal: "Dinner", item: "Salmon, rice & greens", time: "7:30p", kcal: 294, icon: "moon" },
  ];
  return (
    <React.Fragment>
      <Eyebrow>Calories</Eyebrow>
      <div style={{ padding: "16px 18px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-3xl)", color: "var(--text-strong)" }}>{remaining.toLocaleString()}</span>
          <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", fontWeight: 600 }}>kcal remaining</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "var(--ring-track)", overflow: "hidden", margin: "14px 0 12px" }}>
          <div style={{ height: "100%", width: Math.round((food / (goal + exercise)) * 100) + "%", borderRadius: 999, background: "var(--ai-gradient)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[["Base goal", goal.toLocaleString(), "target"], ["Food", food.toLocaleString(), "eaten"], ["Exercise", "+" + exercise, "burned"]].map(([k, v, s]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--text-strong)" }}>{v}</div>
              <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontWeight: 600, marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      <Eyebrow>Macros</Eyebrow>
      <div style={{ display: "flex", gap: 10, padding: "16px 14px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
        <MacroRing label="Protein" value={96} goal={120} hue="var(--hue-move)" />
        <MacroRing label="Carbs" value={180} goal={240} hue="var(--hue-energy)" />
        <MacroRing label="Fat" value={52} goal={68} hue="var(--hue-mind)" />
      </div>

      <Eyebrow>Hydration &amp; fiber</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Tile label="Hydration" value="1.6" unit="L" hue="var(--hue-hydration)" icon="glass-water" goal="/ 2.5L" spark={[2.1, 2.4, 1.9, 2.6, 2.2, 1.4, 1.6]} />
        <Tile label="Fiber" value="22" unit="g" hue="var(--hue-nutrition)" icon="wheat" goal="/ 30g" spark={[18, 24, 20, 28, 26, 19, 22]} />
      </div>

      <Eyebrow>Micronutrients</Eyebrow>
      <div style={{ padding: "10px 16px", borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)" }}>
        <MicroBar label="Sugar" value={38} goal={50} unit="g" hue="var(--hue-nutrition)" />
        <MicroBar label="Sodium" value={1850} goal={2300} unit="mg" hue="var(--hue-energy)" />
        <MicroBar label="Potassium" value={2600} goal={3400} unit="mg" hue="var(--hue-move)" />
        <MicroBar label="Calcium" value={820} goal={1000} unit="mg" hue="var(--sky-400)" />
        <MicroBar label="Iron" value={12} goal={18} unit="mg" hue="var(--hue-heart)" />
      </div>

      <Eyebrow note="1,438 kcal">Today's meals</Eyebrow>
      <div style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)", overflow: "hidden" }}>
        {meals.map((m, i) => (
          <div key={m.meal} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "color-mix(in oklab, var(--hue-nutrition) 16%, transparent)", color: "var(--hue-nutrition)" }}>
              <window.Icon name={m.icon} size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-strong)" }}>{m.meal}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.item}</div>
            </div>
            <div style={{ textAlign: "right", flex: "0 0 auto" }}>
              <div className="fv-stat" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--text-strong)" }}>{m.kcal}</div>
              <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

/* ── Activity ── */
function BodyActivity() {
  const sessions = [
    { type: "Outdoor run", icon: "footprints", dist: "5.2 km", dur: "27:41", kcal: 384, hue: "var(--hue-move)" },
    { type: "Morning walk", icon: "footprints", dist: "1.1 km", dur: "14:00", kcal: 78, hue: "var(--hue-oxygen)" },
  ];
  return (
    <React.Fragment>
      <Eyebrow>Today</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Tile label="Steps" value="8,240" hue="var(--hue-move)" icon="footprints" goal="/ 10k" />
        <Tile label="Distance" value="5.2" unit="km" hue="var(--hue-oxygen)" icon="map-pin" />
        <Tile label="Floors" value="9" hue="var(--hue-energy)" icon="trending-up" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Tile label="Active energy" value="612" unit="kcal" hue="var(--hue-energy)" icon="flame" goal="/ 750" spark={[410, 520, 480, 612, 560, 470, 612]} />
        <Tile label="Zone minutes" value="32" unit="min" hue="var(--hue-heart)" icon="timer" goal="/ 50" spark={[18, 40, 26, 52, 38, 12, 32]} />
      </div>

      <Eyebrow>Today's sessions</Eyebrow>
      <div style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-card)", boxShadow: "var(--ring-hairline), var(--ring-card)", overflow: "hidden" }}>
        {sessions.map((s, i) => (
          <div key={s.type} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${s.hue} 16%, transparent)`, color: s.hue }}>
              <window.Icon name={s.icon} size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-strong)" }}>{s.type}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.dist} · {s.dur} · {s.kcal} kcal</div>
            </div>
            <span style={{ color: "var(--text-faint)" }}><window.Icon name="chevron-right" size={20} /></span>
          </div>
        ))}
      </div>

      <Eyebrow>This week</Eyebrow>
      <window.TrainingLoad />
    </React.Fragment>
  );
}

Object.assign(window, { BodyVitals, BodyNutrition, BodyActivity });
