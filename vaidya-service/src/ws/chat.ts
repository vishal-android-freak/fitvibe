/**
 * WebSocket live chat. The app connects with a Firebase ID token (and optionally
 * a conversationId to resume), then sends user messages with optional
 * attachments. We run them through a persistent Pi session (chat prompt + MCP +
 * gen-UI tools) and stream the response back:
 *   { type: "ready", conversationId }  — sent on connect (the session id)
 *   { type: "token", delta }           — streamed assistant text
 *   { type: "block", block }           — a generative-UI block (after the turn)
 *   { type: "tool", name }             — a tool call started ("thinking" UI)
 *   { type: "done" }                   — turn complete
 *   { type: "error", message }
 *
 * Inbound message frame: { message: string, attachments?: Attachment[] }.
 *   Attachment = { kind:'image'|'text', mimeType, name, data(base64) }.
 *   - image -> ImageContent passed to prompt({ images }); multiple supported.
 *   - text  -> base64-decoded and appended to the message as a fenced block.
 *
 * Auth: token via the Authorization header or ?token=. Resume: ?conversationId=.
 */

import { IncomingMessage, type Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { Config } from "../config.js";
import { authUserId, bearer } from "../auth/firebase.js";
import { buildSession } from "../pi/agent.js";
import { loadPrompt } from "../prompts/load.js";
import { BlockCollector } from "../tools/genui.js";

interface Attachment {
  kind: "image" | "text";
  mimeType: string;
  name?: string;
  data: string; // base64
}
interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

function queryParam(req: IncomingMessage, key: string): string | null {
  return new URL(req.url ?? "", "http://localhost").searchParams.get(key);
}

function tokenFromReq(req: IncomingMessage): string | null {
  return bearer(req.headers.authorization) ?? queryParam(req, "token");
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

/** Build the prompt text + image list from a message + its attachments. */
function buildTurn(message: string, attachments: Attachment[]): { text: string; images: ImageContent[] } {
  const images: ImageContent[] = [];
  const fileParts: string[] = [];
  for (const a of attachments) {
    if (a.kind === "image") {
      images.push({ type: "image", data: a.data, mimeType: a.mimeType });
    } else if (a.kind === "text") {
      let content = "";
      try {
        content = Buffer.from(a.data, "base64").toString("utf8");
      } catch {
        content = "";
      }
      if (content) {
        fileParts.push(`Attached file ${a.name ?? "(file)"}:\n\`\`\`\n${content}\n\`\`\``);
      }
    }
  }
  const text = [message, ...fileParts].filter(Boolean).join("\n\n");
  return { text, images };
}

/** Resolve a conversationId to a SessionManager (resume) or a new one. */
async function sessionManagerFor(cwd: string, conversationId: string | null): Promise<SessionManager> {
  if (conversationId) {
    const list = await SessionManager.list(cwd);
    const path = list.find((s) => s.id === conversationId)?.path;
    if (path) return SessionManager.open(path);
  }
  return SessionManager.create(cwd);
}

export function attachChatWs(server: Server, cfg: Config, cwd: string): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/vaidya/chat" });

  wss.on("connection", async (ws, req) => {
    // Capture inbound frames from the FIRST synchronous tick — BEFORE any await.
    // Auth and session-build both await (seconds), and the client sends its first
    // message right after the socket opens; the `ws` library DROPS messages that
    // arrive with no "message" listener, so without attaching now the first
    // message is silently lost and the UI hangs on "loading". A `processMessage`
    // function is wired in once the session is ready; until then frames queue.
    const inbox: string[] = [];
    let session: Awaited<ReturnType<typeof buildSession>> | null = null;
    let closed = false;
    let busy = false;
    let processMessage: ((raw: string) => void) | null = null;
    ws.on("message", (raw) => {
      const s = raw.toString();
      if (processMessage) processMessage(s);
      else inbox.push(s);
    });
    ws.on("close", () => {
      closed = true;
      session?.dispose();
    });

    const token = tokenFromReq(req);
    const userId = token ? await authUserId(token) : null;
    if (userId == null) {
      send(ws, { type: "error", message: "unauthenticated" });
      ws.close(4001, "unauthenticated");
      return;
    }

    const collector = new BlockCollector();

    let pendingText = "";
    const flushPending = () => {
      if (pendingText) {
        send(ws, { type: "token", delta: pendingText });
        pendingText = "";
      }
    };

    async function handleMessage(raw: string) {
      let message = "";
      let attachments: Attachment[] = [];
      try {
        const parsed = JSON.parse(raw);
        message = String(parsed.message ?? parsed.text ?? "");
        if (Array.isArray(parsed.attachments)) attachments = parsed.attachments;
      } catch {
        message = raw;
      }
      if (!message.trim() && attachments.length === 0) return;
      if (!session || busy) {
        // Not ready yet, or a turn is in flight — queue and drain later.
        inbox.push(raw);
        return;
      }
      busy = true;
      const before = collector.blocks.length;
      try {
        const { text, images } = buildTurn(message, attachments);
        await session.prompt(`I am user_id ${userId}. ${text}`, images.length ? { images } : undefined);
        // The final text segment (not followed by any tool) is the real answer.
        flushPending();
        for (const b of collector.blocks.slice(before)) send(ws, { type: "block", block: b });
        send(ws, { type: "done" });
      } catch (err) {
        send(ws, { type: "error", message: String(err) });
      } finally {
        busy = false;
        // Drain the next queued message, if any.
        const next = inbox.shift();
        if (next && !closed) void handleMessage(next);
      }
    }

    // Build the session (slow), then start streaming + drain any queued frames.
    try {
      const sm = await sessionManagerFor(cwd, queryParam(req, "conversationId"));
      session = await buildSession(cfg, {
        systemPrompt: loadPrompt("chat"),
        cwd,
        sessionManager: sm,
        blockCollector: collector,
      });
    } catch (err) {
      send(ws, { type: "error", message: `session init failed: ${String(err)}` });
      ws.close(1011, "init failed");
      return;
    }
    if (closed) {
      session.dispose();
      return;
    }

    // Suppress the model's between-tool plan narration. Text is buffered and
    // only the final segment (not followed by a tool call) is flushed at turn
    // end, so plumbing chatter never reaches the client.
    session.subscribe((e: any) => {
      if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
        pendingText += e.assistantMessageEvent.delta;
      } else if (e.type === "tool_execution_start") {
        pendingText = "";
        send(ws, { type: "tool", name: e.toolName });
      }
    });

    send(ws, { type: "ready", conversationId: session.sessionId });

    // Live frames now go straight to handleMessage; drain anything queued during
    // auth/build.
    processMessage = (raw) => void handleMessage(raw);
    const first = inbox.shift();
    if (first) void handleMessage(first);
  });

  return wss;
}
