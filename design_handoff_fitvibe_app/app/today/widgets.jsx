/* FitVibe — Today configurable widget grid.
   The top metric section is user-editable: remove, reorder (drag), and add
   widgets from a standard catalog.
   Exports: WIDGET_REGISTRY, DEFAULT_WIDGETS, WidgetGrid, AddWidgetSheet. */

const WIDGET_REGISTRY = {
  resting_hr: { label: "Resting HR", hue: "var(--hue-heart)", icon: "heart", value: "54", unit: "bpm", spark: [58,57,57,56,55,54,54] },
  hrv:        { label: "HRV", hue: "var(--hue-mind)", icon: "activity", value: "62", unit: "ms", delta: "12%", deltaDir: "up", spark: [52,55,54,58,60,61,62] },
  sleep:      { label: "Sleep", hue: "var(--hue-sleep)", icon: "moon", value: "7h 12m", delta: "24m", deltaDir: "up", spark: [402,418,395,470,441,388,432] },
  steps:      { label: "Steps", hue: "var(--hue-move)", icon: "footprints", value: "8,240", goal: "/ 10k", delta: "12%", deltaDir: "up", spark: [6200,9100,7400,12030,8800,6400,8240] },
  energy:     { label: "Active energy", hue: "var(--hue-energy)", icon: "flame", value: "612", unit: "kcal", goal: "/ 750", spark: [410,520,480,612,560,470,612] },
  spo2:       { label: "SpO\u2082", hue: "var(--hue-oxygen)", icon: "wind", value: "97", unit: "%", spark: [96,97,96,97,98,97,97] },
  hydration:  { label: "Hydration", hue: "var(--hue-hydration)", icon: "glass-water", value: "1.6", unit: "L", goal: "/ 2.5L", delta: "0.4 L", deltaDir: "down", spark: [2.1,2.4,1.9,2.6,2.2,1.4,1.6] },
  exercise:   { label: "Exercise", hue: "var(--hue-move)", icon: "dumbbell", value: "32", unit: "min", goal: "/ 50", spark: [18,40,26,52,38,12,32] },
  vo2:        { label: "VO\u2082 max", hue: "var(--hue-move)", icon: "gauge", value: "44", unit: "ml/kg", delta: "1", deltaDir: "up", spark: [42,42,43,43,43,44,44] },
  weight:     { label: "Weight", hue: "var(--sky-400)", icon: "scale", value: "68.4", unit: "kg", spark: [69.1,69.0,68.8,68.7,68.6,68.5,68.4] },
  distance:   { label: "Distance", hue: "var(--hue-move)", icon: "map-pin", value: "5.2", unit: "km", spark: [3.1,6.0,4.2,7.4,5.1,2.0,5.2] },
  mind:       { label: "Stress", hue: "var(--hue-mind)", icon: "brain", value: "Low", spark: [3,4,3,2,2,3,2] },
};

const DEFAULT_WIDGETS = ["resting_hr", "hrv", "sleep", "steps", "energy", "spo2"];

function WidgetTile({ id, editing, onRemove, dragHandlers, dragging }) {
  const { StatTile } = window.FitVibeDesignSystem_52b6f8;
  const w = WIDGET_REGISTRY[id];
  if (!w) return null;
  return (
    <div
      className={editing ? "wig" : ""}
      draggable={editing}
      {...(editing ? dragHandlers : {})}
      style={{ position: "relative", opacity: dragging ? 0.4 : 1, cursor: editing ? "grab" : "default", transition: "opacity var(--dur-base)" }}>
      <StatTile
        label={w.label} value={w.value} unit={w.unit} hue={w.hue}
        icon={<window.Icon name={w.icon} size={16} />}
        delta={w.delta} deltaDir={w.deltaDir} goal={w.goal} spark={w.spark}
        style={{ padding: "13px 14px", gap: 7 }} />
      {editing && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(id); }} aria-label={"Remove " + w.label} style={{
          position: "absolute", top: -7, right: -7, width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--bg-app)",
          background: "var(--danger)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 3, boxShadow: "var(--shadow-sm)",
        }}><window.Icon name="minus" size={14} stroke={3} /></button>
      )}
      {editing && (
        <span style={{ position: "absolute", bottom: 9, right: 11, color: "var(--text-faint)", opacity: 0.6 }}>
          <window.Icon name="grip-vertical" size={15} />
        </span>
      )}
    </div>
  );
}

function WidgetGrid({ ids, editing, onRemove, onReorder, onAddClick }) {
  const [dragIdx, setDragIdx] = React.useState(null);

  const handlers = (i) => ({
    onDragStart: (e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; },
    onDragOver: (e) => { e.preventDefault(); },
    onDrop: (e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i); setDragIdx(null); },
    onDragEnd: () => setDragIdx(null),
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {ids.map((id, i) => (
        <WidgetTile key={id} id={id} editing={editing} onRemove={onRemove}
          dragHandlers={handlers(i)} dragging={dragIdx === i} />
      ))}
      {editing && (
        <button onClick={onAddClick} style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
          minHeight: 104, borderRadius: "var(--radius-lg)", border: "1.5px dashed var(--border-strong)",
          background: "transparent", color: "var(--text-muted)", cursor: "pointer",
          fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "var(--text-sm)",
          transition: "border-color var(--dur-base), color var(--dur-base)",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
          <window.Icon name="plus" size={22} />
          Add widget
        </button>
      )}
    </div>
  );
}

function AddWidgetSheet({ open, currentIds, onPick, onClose }) {
  const available = Object.keys(WIDGET_REGISTRY).filter((id) => !currentIds.includes(id));
  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, zIndex: 70, background: "rgba(3,5,9,.6)",
        backdropFilter: "blur(2px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity var(--dur-base) var(--ease-out)",
      }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 71, maxHeight: "76%",
        background: "var(--surface-overlay)", borderRadius: "28px 28px 0 0",
        boxShadow: "var(--shadow-xl)", borderTop: "1px solid var(--border-subtle)",
        transform: open ? "translateY(0)" : "translateY(101%)",
        transition: "transform var(--dur-slow) var(--ease-out)",
        display: "flex", flexDirection: "column", paddingBottom: 18,
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <span style={{ width: 40, height: 5, borderRadius: 999, background: "var(--border-strong)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 12px" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)" }}>Add a widget</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>From your Google Health data</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", color: "var(--text-strong)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <window.Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {available.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)", padding: "30px 0" }}>All widgets are on your dashboard.</div>
          )}
          {available.map((id) => {
            const w = WIDGET_REGISTRY[id];
            return (
              <button key={id} onClick={() => onPick(id)} style={{
                display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: "var(--radius-md)",
                background: "var(--surface-card)", border: "1px solid var(--border-subtle)", cursor: "pointer",
                textAlign: "left", width: "100%", fontFamily: "var(--font-sans)",
              }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", background: `color-mix(in oklab, ${w.hue} 16%, transparent)`, color: w.hue }}>
                  <window.Icon name={w.icon} size={19} />
                </span>
                <span style={{ flex: 1, fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-body)" }}>{w.label}</span>
                <span style={{ color: "var(--accent)" }}><window.Icon name="plus" size={20} /></span>
              </button>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { WIDGET_REGISTRY, DEFAULT_WIDGETS, WidgetGrid, AddWidgetSheet });
