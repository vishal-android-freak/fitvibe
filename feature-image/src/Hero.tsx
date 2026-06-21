import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RADIUS } from "./Tile";
import { ai, accent, hue } from "./theme";

/** The central hero tile — FitVibe over the signature aurora sunburst gradient,
 *  the way Apple puts "macOS" / "iOS" on a radial-ray field. `scale` lets a
 *  smaller container (e.g. the social card) shrink the wordmark proportionally. */
export const Hero: React.FC<{ scale?: number }> = ({ scale: typeScale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - 4, fps, config: { damping: 20, mass: 0.9 } });
  const scale = interpolate(enter, [0, 1], [0.94, 1]);
  const opacity = interpolate(enter, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  // Slow drift of the ray field + a breathing glow.
  const spin = interpolate(frame, [0, 300], [0, 18]);
  const glow = interpolate(Math.sin((frame / fps) * 1.1), [-1, 1], [0.55, 0.95]);

  // Sunburst: alternating aurora wedges via a repeating conic gradient.
  const rays =
    `repeating-conic-gradient(from ${spin}deg at 50% 42%, ` +
    `${ai.from} 0deg 11deg, ` +
    `${accent.press} 11deg 22deg, ` +
    `${ai.mid} 22deg 33deg, ` +
    `${hue.sky} 33deg 44deg)`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: RADIUS,
        overflow: "hidden",
        transform: `scale(${scale})`,
        opacity,
        boxShadow: "0 40px 90px -30px rgba(34,211,238,0.35), 0 24px 60px -28px rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {/* the radiating ray field */}
      <div style={{ position: "absolute", inset: "-30%", background: rays, filter: "saturate(1.15)" }} />
      {/* center bloom that softens the rays toward the middle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(120% 90% at 50% 42%, rgba(103,232,249,${glow * 0.9}) 0%, rgba(167,139,250,0.35) 38%, rgba(10,14,26,0.0) 72%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* bottom darkening so the wordmark reads */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,14,26,0) 40%, rgba(10,14,26,0.55) 100%)",
        }}
      />

      {/* wordmark + tagline (the wordmark IS the hero, like Apple's "macOS") */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18 * typeScale,
        }}
      >
        <div
          style={{
            fontFamily: "Sora",
            fontWeight: 800,
            fontSize: 148 * typeScale,
            color: "#FFFFFF",
            letterSpacing: -4 * typeScale,
            textShadow: "0 8px 50px rgba(0,0,0,0.5)",
            lineHeight: 1,
          }}
        >
          FitVibe
        </div>
        <div
          style={{
            fontFamily: "Sora",
            fontWeight: 600,
            fontSize: 36 * typeScale,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: 0.2,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          Own your health data.
        </div>
      </div>
    </div>
  );
};
