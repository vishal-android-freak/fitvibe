import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { surface, text } from "./theme";

export const RADIUS = 34;

/** A single feature tile — a rounded card holding a visual + a caption, with a
 *  spring entrance staggered by `index`. Mirrors Apple's WWDC feature grid. */
export const Tile: React.FC<{
  index: number;
  caption: string;
  children: React.ReactNode;
  background?: string;
  captionColor?: string;
  contentPadding?: number;
  captionSize?: number;
  /** push content to the top and caption to the bottom (default), or center it */
  center?: boolean;
}> = ({
  index,
  caption,
  children,
  background = surface.card,
  captionColor = text.primary,
  contentPadding = 34,
  captionSize = 30,
  center,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = 8 + index * 2.2;
  const enter = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.7 } });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: RADIUS,
        background,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 60px -28px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: center ? "center" : "stretch",
        justifyContent: center ? "center" : "space-between",
        padding: contentPadding,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <div
        style={{
          flex: center ? "none" : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 0,
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontFamily: "Sora",
          fontWeight: 600,
          fontSize: captionSize,
          lineHeight: 1.2,
          color: captionColor,
          marginTop: center ? 0 : 22,
          textAlign: center ? "center" : "left",
          letterSpacing: -0.3,
        }}
      >
        {caption}
      </div>
    </div>
  );
};

/** A small label + value stat used inside tiles. */
export const Stat: React.FC<{ value: string; label: string; color?: string }> = ({
  value,
  label,
  color = text.primary,
}) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
    <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 56, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontFamily: "Sora", fontWeight: 500, fontSize: 22, color: text.tertiary, letterSpacing: 0.5 }}>
      {label}
    </div>
  </div>
);
