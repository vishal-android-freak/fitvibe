import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";
import { Tile } from "./Tile";
import { Hero } from "./Hero";
import { ActivityRings, ChatBubble, Hypnogram, Ring, Sparkline } from "./primitives";
import { accent, ai, hue, surface, text, tint } from "./theme";

loadFont();

const GAP = 22;
const PAD = 44;

/**
 * GitHub social-preview card — 1280×640 (2:1). Shown small in link previews, so
 * it's bolder and simpler than the full feature grid: a wide hero across the top
 * with a row of feature tiles beneath. Same brand + Apple-feature-grid language.
 */
export const Social: React.FC = () => {
  const frame = useCurrentFrame();
  const bgShift = interpolate(frame, [0, 300], [0, 100]);

  return (
    <AbsoluteFill style={{ background: surface.bgApp }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 70% at ${22 + bgShift * 0.08}% 12%, ${tint(accent.base, 0.22)} 0%, rgba(10,14,26,0) 55%),
                       radial-gradient(70% 70% at ${82 - bgShift * 0.06}% 95%, ${tint(ai.mid, 0.16)} 0%, rgba(10,14,26,0) 55%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: PAD,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "1.35fr 1fr",
          gap: GAP,
        }}
      >
        {/* Hero — wide across the top three columns */}
        <div style={{ gridColumn: "1 / 4", gridRow: "1 / 2" }}>
          <Hero scale={0.62} />
        </div>

        {/* Readiness — tall, top-right */}
        <Tile index={0} caption="Readiness" center captionSize={20} contentPadding={26}>
          <Ring size={140} stroke={15} value={0.86} color={accent.base}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 48, color: text.primary }}>86</div>
            <div style={{ fontFamily: "Sora", fontWeight: 600, fontSize: 13, color: hue.move, letterSpacing: 1 }}>
              READY
            </div>
          </Ring>
        </Tile>

        {/* Bottom row of features */}
        <Tile index={1} caption="Sleep" captionSize={20} contentPadding={26}>
          <Hypnogram width={190} height={60} />
        </Tile>

        <Tile index={2} caption="Heart & HRV" captionSize={20} contentPadding={26}>
          <Sparkline width={190} height={88} color={hue.heart} />
        </Tile>

        <Tile index={3} caption="Activity" captionSize={20} contentPadding={26}>
          <ActivityRings size={112} />
        </Tile>

        {/* Ask Vaidya — wide, bottom-right */}
        <Tile index={4} caption="Ask Vaidya — your AI coach" background={surface.raised} captionSize={20} contentPadding={26}>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, width: "100%", justifyContent: "center" }}>
            <ChatBubble align="left" width={210} fontSize={18}>
              How did I sleep?
            </ChatBubble>
            <ChatBubble align="right" gradient width={280} fontSize={18}>
              7h 12m — deep sleep up 14%.
            </ChatBubble>
          </div>
        </Tile>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
