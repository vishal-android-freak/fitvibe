/**
 * Replays a stored Pi session by id to recover the generative-UI blocks the
 * agent emitted, plus its narrative text. We store only the session id in
 * vaidya_insights; the content lives in the session's JSONL transcript.
 *
 * The transcript is line-delimited JSON. Assistant messages carry content blocks
 * of type "toolCall" = { type:"toolCall", id, name, arguments }. We pull the
 * arguments of emit_block / emit_canvas calls (in order) and the assistant text.
 */

import { readFile } from "node:fs/promises";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { type GenerativeBlock as Block } from "../tools/blocks.js";
import { blockFromToolCall } from "./transcript.js";

export interface ReplayResult {
  blocks: Block[];
  text: string;
}

/** Resolve a session id to its transcript file path (within cwd's session dir). */
async function sessionPath(cwd: string, sessionId: string): Promise<string | null> {
  const list = await SessionManager.list(cwd);
  return list.find((s) => s.id === sessionId)?.path ?? null;
}

/** Read a session transcript and extract emitted blocks + assistant text. */
export async function replaySession(cwd: string, sessionId: string): Promise<ReplayResult> {
  const path = await sessionPath(cwd, sessionId);
  if (!path) return { blocks: [], text: "" };

  const raw = await readFile(path, "utf8");
  const blocks: Block[] = [];
  const textParts: string[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: any;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (rec.type !== "message") continue;
    const msg = rec.message ?? rec;
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;

    for (const c of msg.content) {
      if (!c || typeof c !== "object") continue;
      if (c.type === "text" && typeof c.text === "string") {
        textParts.push(c.text);
        continue;
      }
      const block = blockFromToolCall(c);
      if (block) blocks.push(block);
    }
  }

  return { blocks, text: textParts.join("\n\n").trim() };
}
