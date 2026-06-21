import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";
import { Tile } from "./Tile";
import { Hero } from "./Hero";
import {
  ActivityRings,
  Bars,
  ChatBubble,
  Gauge,
  Hypnogram,
  MacroRings,
  Ring,
  Sparkline,
} from "./primitives";
import { accent, ai, hue, surface, text, tint } from "./theme";

loadFont();

const GAP = 26;
const PAD = 60;

/**
 * Apple WWDC-style feature mosaic for FitVibe. A 6-col × 3-row grid: the hero
 * (FitVibe over the aurora sunburst) is a large central block; real FitVibe
 * features fill the surrounding tiles, each with a caption.
 */
export const FeatureGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const bgShift = interpolate(frame, [0, 300], [0, 100]);

  return (
    <AbsoluteFill style={{ background: surface.bgApp }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 55% at ${18 + bgShift * 0.08}% 14%, ${tint(accent.base, 0.2)} 0%, rgba(10,14,26,0) 55%),
                       radial-gradient(65% 55% at ${86 - bgShift * 0.06}% 92%, ${tint(ai.mid, 0.16)} 0%, rgba(10,14,26,0) 55%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: PAD,
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: GAP,
        }}
      >
        {/* ── Row 1 ── */}
        <Tile index={0} caption="Readiness">
          <Ring size={170} stroke={17} value={0.86} color={accent.base}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 58, color: text.primary }}>86</div>
            <div style={{ fontFamily: "Sora", fontWeight: 600, fontSize: 16, color: hue.move, letterSpacing: 1 }}>
              READY
            </div>
          </Ring>
        </Tile>

        <Tile index={1} caption="Sleep stages & score">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
            <div style={{ position: "relative", width: 120, height: 120 }}>
              <Gauge size={120} value={0.78} color={hue.sleep} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Sora",
                  fontWeight: 800,
                  fontSize: 44,
                  color: text.primary,
                }}
              >
                78
              </div>
            </div>
            <Hypnogram width={260} height={70} />
          </div>
        </Tile>

        {/* Hero — center block, cols 3-4, rows 1-2 */}
        <div style={{ gridColumn: "3 / 5", gridRow: "1 / 3" }}>
          <Hero />
        </div>

        <Tile index={2} caption="Heart & HRV">
          <Sparkline width={260} height={150} color={hue.heart} />
        </Tile>

        <Tile index={3} caption="Activity rings">
          <ActivityRings size={170} />
        </Tile>

        {/* ── Row 2 ── */}
        <Tile index={4} caption="Steps & distance">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 54, color: hue.move, letterSpacing: -1 }}>
              8,240
            </div>
            <div style={{ fontFamily: "Sora", fontWeight: 600, fontSize: 18, color: text.tertiary, letterSpacing: 1 }}>
              STEPS TODAY
            </div>
          </div>
        </Tile>

        <Tile index={5} caption="Weekly load">
          <Bars width={250} height={150} color={hue.energy} />
        </Tile>

        <Tile index={6} caption="Nutrition & macros">
          <MacroRings size={92} />
        </Tile>

        <Tile index={7} caption="Hydration">
          <Ring size={150} stroke={15} value={0.62} color={hue.hydration}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 40, color: text.primary }}>1.5</div>
            <div style={{ fontFamily: "Sora", fontWeight: 600, fontSize: 16, color: text.tertiary }}>liters</div>
          </Ring>
        </Tile>

        {/* ── Row 3 ── Ask Vaidya is the headline feature: a wide tile spanning 3 cols */}
        <div style={{ gridColumn: "1 / 4", gridRow: "3 / 4" }}>
          <Tile index={8} caption="Ask Vaidya — your AI health coach" background={surface.raised}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", justifyContent: "center" }}>
              <ChatBubble align="left" width={420} fontSize={28}>
                How did I sleep last night?
              </ChatBubble>
              <ChatBubble align="right" gradient width={640} fontSize={28}>
                7h 12m — your deep sleep is up 14% vs baseline. Nice recovery. 💜
              </ChatBubble>
            </div>
          </Tile>
        </div>

        {/* Nightly insights — wide tile spanning the remaining 2 cols */}
        <div style={{ gridColumn: "5 / 7", gridRow: "3 / 4" }}>
          <Tile index={9} caption="Nightly AI insights">
            <div style={{ display: "flex", alignItems: "center", gap: 26, width: "100%" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${ai.from}, ${ai.mid})`,
                  flexShrink: 0,
                  boxShadow: `0 12px 30px -8px ${tint(ai.mid, 0.5)}`,
                }}
              />
              <div style={{ fontFamily: "Sora", fontWeight: 600, fontSize: 30, color: text.secondary, lineHeight: 1.4 }}>
                <span style={{ color: text.primary }}>Late dinners</span> are nudging your HRV down — try eating 2h earlier.
              </div>
            </div>
          </Tile>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
