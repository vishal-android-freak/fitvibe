import React from "react";
import { hue, ai, text, tint } from "./theme";

/** A progress ring (readiness / activity). */
export const Ring: React.FC<{
  size: number;
  stroke: number;
  value: number; // 0..1
  color: string;
  track?: string;
  children?: React.ReactNode;
}> = ({ size, stroke, value, color, track = "rgba(255,255,255,0.10)", children }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Concentric activity rings (Apple-style move/exercise/stand). */
export const ActivityRings: React.FC<{ size: number }> = ({ size }) => {
  const rings = [
    { v: 0.82, c: hue.heart },
    { v: 0.66, c: hue.move },
    { v: 0.48, c: hue.oxygen },
  ];
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {rings.map((ring, i) => {
        const s = size - i * (size * 0.26);
        return (
          <div key={i} style={{ position: "absolute", inset: (size - s) / 2 }}>
            <Ring size={s} stroke={size * 0.1} value={ring.v} color={ring.c} />
          </div>
        );
      })}
    </div>
  );
};

/** A hypnogram (sleep stages) bar chart. */
export const Hypnogram: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  // [stageLevel(0=deep..3=awake), widthFraction]
  const segs: [number, number][] = [
    [1, 0.06], [0, 0.14], [1, 0.1], [2, 0.16], [0, 0.12], [1, 0.08],
    [2, 0.14], [3, 0.04], [1, 0.08], [2, 0.08],
  ];
  const colors = [hue.sleep, "#6F74E0", hue.mind, tint(hue.mind, 0.5)];
  const rowH = height / 4;
  let x = 0;
  return (
    <svg width={width} height={height}>
      {segs.map(([lvl, frac], i) => {
        const w = frac * width;
        const y = (3 - lvl) * rowH;
        const el = (
          <rect key={i} x={x} y={y + 3} width={Math.max(w - 3, 2)} height={rowH - 6} rx={4} fill={colors[lvl]} />
        );
        x += w;
        return el;
      })}
    </svg>
  );
};

/** A smooth sparkline with gradient fill. */
export const Sparkline: React.FC<{ width: number; height: number; color: string; data?: number[] }> = ({
  width,
  height,
  color,
  data = [0.3, 0.5, 0.42, 0.66, 0.58, 0.78, 0.7, 0.88, 0.95],
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min || 1)) * (height * 0.82) - height * 0.09;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tint(color, 0.32)} />
          <stop offset="100%" stopColor={tint(color, 0)} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={5} fill={color} />
    </svg>
  );
};

/** Bar chart (weekly). */
export const Bars: React.FC<{ width: number; height: number; color: string }> = ({ width, height, color }) => {
  const data = [0.4, 0.62, 0.5, 0.8, 0.55, 0.9, 0.72];
  const gap = width * 0.04;
  const bw = (width - gap * (data.length - 1)) / data.length;
  return (
    <svg width={width} height={height}>
      {data.map((d, i) => (
        <rect
          key={i}
          x={i * (bw + gap)}
          y={height - d * height}
          width={bw}
          height={d * height}
          rx={Math.min(bw / 2, 7)}
          fill={i === 5 ? color : tint(color, 0.45)}
        />
      ))}
    </svg>
  );
};

/** Macro rings trio. */
export const MacroRings: React.FC<{ size: number }> = ({ size }) => {
  const macros = [
    { v: 0.7, c: hue.energy },
    { v: 0.55, c: hue.nutrition },
    { v: 0.85, c: hue.oxygen },
  ];
  return (
    <div style={{ display: "flex", gap: size * 0.18 }}>
      {macros.map((m, i) => (
        <Ring key={i} size={size} stroke={size * 0.14} value={m.v} color={m.c} />
      ))}
    </div>
  );
};

/** A chat bubble (Ask Vaidya). */
export const ChatBubble: React.FC<{
  children: React.ReactNode;
  align: "left" | "right";
  gradient?: boolean;
  width: number;
  fontSize: number;
}> = ({ children, align, gradient, width, fontSize }) => {
  return (
    <div
      style={{
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        maxWidth: width,
        padding: `${fontSize * 0.7}px ${fontSize}px`,
        borderRadius: fontSize * 1.4,
        borderBottomRightRadius: align === "right" ? fontSize * 0.4 : fontSize * 1.4,
        borderBottomLeftRadius: align === "left" ? fontSize * 0.4 : fontSize * 1.4,
        background: gradient
          ? `linear-gradient(135deg, ${ai.from}, ${ai.mid})`
          : "rgba(255,255,255,0.07)",
        border: gradient ? "none" : "1px solid rgba(255,255,255,0.10)",
        color: gradient ? text.onGradient : text.primary,
        fontFamily: "Sora",
        fontWeight: gradient ? 600 : 500,
        fontSize,
        lineHeight: 1.35,
      }}
    >
      {children}
    </div>
  );
};

/** Gauge arc (e.g. sleep score). */
export const Gauge: React.FC<{ size: number; value: number; color: string }> = ({ size, value, color }) => {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const sweep = 270;
  const toXY = (angle: number) => {
    const a = (angle * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const arcPath = (frac: number) => {
    const [x0, y0] = toXY(startAngle);
    const end = startAngle + sweep * frac;
    const [x1, y1] = toXY(end);
    const large = sweep * frac > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  return (
    <svg width={size} height={size}>
      <path d={arcPath(1)} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={size * 0.09} strokeLinecap="round" />
      <path d={arcPath(value)} fill="none" stroke={color} strokeWidth={size * 0.09} strokeLinecap="round" />
    </svg>
  );
};
