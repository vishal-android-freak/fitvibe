/**
 * Shared helpers for reading Pi session transcripts (line-delimited JSON). Both
 * replay.ts (insight blocks) and conversations.ts (chat history) parse the same
 * assistant `toolCall` content items, so the block-extraction logic lives here.
 */

import { GenerativeBlock, type GenerativeBlock as Block } from "../tools/blocks.js";

/** Parse a JSON string, returning the original value if it isn't valid JSON. */
export function coerce(v: unknown): unknown {
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
 * If `c` is an emit_block/emit_canvas tool call, return the validated
 * GenerativeBlock it carries; otherwise null. Centralizes how a stored tool call
 * becomes a renderable block.
 */
export function blockFromToolCall(c: any): Block | null {
  if (!c || c.type !== "toolCall") return null;
  if (c.name !== "emit_block" && c.name !== "emit_canvas") return null;

  const args = c.arguments ?? {};
  const candidate =
    c.name === "emit_block"
      ? coerce(args.block)
      : { kind: "canvas", ...(typeof args === "object" ? args : {}) };

  const parsed = GenerativeBlock.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
