/**
 * Conversation history + resume, read from Pi session transcripts. Single-user
 * app, so all chat sessions in the cwd session dir belong to the user. We list
 * recent sessions and read a session's recent messages directly from its JSONL
 * (same approach as replay.ts) — no need to spin up a full agent session.
 *
 * Only CHAT sessions are surfaced (cron insight sessions are short, system-driven
 * — we filter to sessions whose first user message looks like a real question and
 * exclude ones the insight crons created by checking for a user turn).
 */

import { readFile } from "node:fs/promises";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { type GenerativeBlock as Block } from "../tools/blocks.js";
import { blockFromToolCall } from "./transcript.js";

export interface ConversationSummary {
  id: string;
  title: string;
  lastAt: string; // ISO
  preview: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  blocks?: Block[];
}

/** First line of a string, trimmed + capped — for titles/previews. */
function firstLine(s: string, cap = 80): string {
  const line = s.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  return line.length > cap ? line.slice(0, cap - 1) + "…" : line;
}

/** Strip the injected "I am user_id N. " prefix the WS/cron adds to user turns. */
function cleanUserText(s: string): string {
  return s.replace(/^I am user_id \d+\.\s*/i, "").trim();
}

/** Cron insight sessions live in the same session dir but aren't user chats —
 *  their first turn is one of these deterministic generation tasks. Exclude them
 *  from the chat-history list. */
function isInsightSession(firstMessage: string): boolean {
  return /^Generate the (per-sleep insight|Today headline|detailed end-of-day report)/i.test(
    firstMessage.trim(),
  );
}

/**
 * List recent conversations (within `days`), newest first. A conversation is a
 * persisted chat session with at least one user message.
 */
export async function listConversations(cwd: string, days = 7): Promise<ConversationSummary[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const sessions = await SessionManager.list(cwd);
  const out: ConversationSummary[] = [];

  for (const s of sessions) {
    const modified = s.modified instanceof Date ? s.modified.getTime() : Date.parse(String(s.modified));
    if (isFinite(modified) && modified < since) continue;

    // Use the session's first user message as the title (firstMessage on the
    // SessionInfo, cleaned of the user_id prefix). Skip sessions with no user
    // text, and skip cron insight sessions (not user chats).
    const first = cleanUserText(s.firstMessage ?? "");
    if (!first || isInsightSession(first)) continue;

    out.push({
      id: s.id,
      title: firstLine(first),
      preview: firstLine(s.allMessagesText ? cleanUserText(s.allMessagesText) : first, 120),
      lastAt: (s.modified instanceof Date ? s.modified : new Date(modified)).toISOString(),
    });
  }

  out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return out;
}

/** Resolve a session id to its transcript path. */
async function pathForId(cwd: string, id: string): Promise<string | null> {
  const list = await SessionManager.list(cwd);
  return list.find((s) => s.id === id)?.path ?? null;
}

/**
 * The last `limit` user/assistant messages of a conversation, oldest→newest, with
 * any generative blocks attached to the assistant turn that emitted them.
 */
export async function conversationMessages(
  cwd: string,
  id: string,
  limit = 50,
): Promise<ConversationMessage[]> {
  const path = await pathForId(cwd, id);
  if (!path) return [];
  const raw = await readFile(path, "utf8");

  const msgs: ConversationMessage[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let rec: any;
    try {
      rec = JSON.parse(t);
    } catch {
      continue;
    }
    if (rec.type !== "message") continue;
    const m = rec.message ?? rec;

    if (m.role === "user") {
      const text = Array.isArray(m.content)
        ? m.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("")
        : typeof m.content === "string"
          ? m.content
          : "";
      const clean = cleanUserText(text);
      if (clean) msgs.push({ role: "user", text: clean });
    } else if (m.role === "assistant" && Array.isArray(m.content)) {
      let text = "";
      const blocks: Block[] = [];
      // An assistant record that calls a data/read tool (anything other than the
      // gen-UI emit_* tools) is a between-tool PLANNING turn — its text is plumbing
      // narration ("Let me query your trends…") the user must never see. Mirror the
      // live path: suppress text from any record that made such a call. The real
      // answer is the final record, which only emits text (+ maybe emit_block).
      let hasDataToolCall = false;
      for (const c of m.content) {
        if (c?.type === "text" && typeof c.text === "string") {
          text += c.text;
          continue;
        }
        const block = blockFromToolCall(c);
        if (block) blocks.push(block);
        else if (c?.type === "toolCall") hasDataToolCall = true;
      }
      if (hasDataToolCall) text = "";
      if (text.trim() || blocks.length) {
        msgs.push({ role: "assistant", text: text.trim(), ...(blocks.length ? { blocks } : {}) });
      }
    }
  }

  return msgs.slice(-limit);
}
