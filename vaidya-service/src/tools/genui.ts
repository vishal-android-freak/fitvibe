/**
 * Generative-UI tools: emit_block and emit_canvas.
 *
 * The agent composes a response as prose + a sequence of emit_block calls. Each
 * call validates its argument against the GenerativeBlock zod union and appends
 * it to a per-session collector, so the caller (WS chat / cron) reads the ordered
 * block list after the turn. The Pi session transcript also records the tool
 * calls, so a stored session can be replayed to recover the blocks later.
 *
 * Validation is zod (single source of truth). The TypeBox `parameters` schema is
 * intentionally permissive (a free-form object); real shape enforcement happens
 * in execute() via GenerativeBlock.safeParse, which lets the model self-correct
 * on the returned error text.
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { GenerativeBlock, BLOCK_KINDS, type GenerativeBlock as Block } from "./blocks.js";

/** Collects the blocks emitted during a session, in order. */
export class BlockCollector {
  readonly blocks: Block[] = [];
  add(b: Block) {
    this.blocks.push(b);
  }
  reset() {
    this.blocks.length = 0;
  }
}

function ok(text: string) {
  return { content: [{ type: "text" as const, text }], details: {} };
}

/** Models sometimes pass JSON-as-a-string for object args. Parse strings; pass
 *  objects through. */
function coerce(v: unknown): unknown {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

/**
 * Pi extension factory that registers emit_block + emit_canvas, appending
 * validated blocks to the given collector. Pass this into a session's
 * extensionFactories.
 */
export function genUiExtension(collector: BlockCollector) {
  return (pi: ExtensionAPI) => {
    pi.registerTool({
      name: "emit_block",
      label: "Emit UI block",
      description:
        "Render a UI block in the response. Pass a single GenerativeBlock object " +
        `with a "kind" field. Valid kinds: ${BLOCK_KINDS.join(", ")}. ` +
        "Composite insight blocks: today_headline {title,body,badges?}, " +
        "sleep_insight {title,body:Seg[],badges?}, day_summary {headline,body:Seg[]}. " +
        "Evidence blocks map to app charts (hypnogram, sparkline, bars, ring, " +
        "stat_tile, stat_tile_grid, readiness_card, recovery_signals, streak_dots, " +
        "micro_bars, badge). Seg = {t:string,b?:boolean}. hue = hex or a metric " +
        "token (sleep, heart, move, mind, oxygen, energy, hydration, nutrition). " +
        "Use the data straight from tool results — never fabricate values.",
      parameters: Type.Object({ block: Type.Any() }),
      async execute(_id: string, params: { block: unknown }) {
        const parsed = GenerativeBlock.safeParse(coerce(params?.block));
        if (!parsed.success) {
          return ok(
            "Block rejected — fix and re-emit. Validation errors:\n" +
              JSON.stringify(parsed.error.issues.slice(0, 8), null, 2),
          );
        }
        collector.add(parsed.data);
        return ok(`Emitted ${parsed.data.kind} block (#${collector.blocks.length}).`);
      },
    } as never);

    pi.registerTool({
      name: "emit_canvas",
      label: "Emit canvas",
      description:
        "LAST RESORT for a custom visual that NO structured emit_block kind can " +
        "express. Always prefer emit_block (hypnogram, sparkline, bars, ring, " +
        "stat_tile, readiness_card, etc.) — those match the app's design. Only " +
        "use this for a genuinely novel visual. " +
        "Pass { width, height, background?, ops:[...] }. Draw ops: rect, " +
        "circle, line, path (SVG d), poly, text, image (data:/https src), " +
        "lineargradient (ref via fill 'url(#id)'), group (transform+nested ops). " +
        "Colors are hex or metric token names; unset colors default to the app " +
        "theme. Coordinates are a virtual width×height space scaled to the card.",
      parameters: Type.Object({
        width: Type.Number(),
        height: Type.Number(),
        background: Type.Optional(Type.String()),
        ops: Type.Array(Type.Any()),
      }),
      async execute(_id: string, params: unknown) {
        const p = coerce(params) as Record<string, unknown>;
        if (typeof p?.ops === "string") p.ops = coerce(p.ops);
        const parsed = GenerativeBlock.safeParse({ kind: "canvas", ...p });
        if (!parsed.success) {
          return ok(
            "Canvas rejected — fix and re-emit. Validation errors:\n" +
              JSON.stringify(parsed.error.issues.slice(0, 8), null, 2),
          );
        }
        collector.add(parsed.data);
        return ok(`Emitted canvas block (#${collector.blocks.length}).`);
      },
    } as never);
  };
}
