/**
 * WebSocket live chat. The app connects with a Firebase ID token, then sends
 * user messages; we run them through a persistent per-connection Pi session
 * (chat prompt + MCP tools + gen-UI tools) and stream the response back:
 *   { type: "token", delta }        — streamed assistant text
 *   { type: "block", block }        — a generative-UI block as it's emitted
 *   { type: "tool", name }          — a tool call started (for a "thinking" UI)
 *   { type: "done" }                — turn complete
 *   { type: "error", message }
 *
 * Auth: token via the `Authorization` header or a `?token=` query param on the
 * upgrade request. One Pi session per socket (conversation), persisted so it can
 * be resumed/replayed.
 */

import { IncomingMessage, type Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { Config } from "../config.js";
import { authUserId, bearer } from "../auth/firebase.js";
import { buildSession } from "../pi/agent.js";
import { loadPrompt } from "../prompts/load.js";
import { BlockCollector } from "../tools/genui.js";

function tokenFromReq(req: IncomingMessage): string | null {
  const fromHeader = bearer(req.headers.authorization);
  if (fromHeader) return fromHeader;
  const url = new URL(req.url ?? "", "http://localhost");
  return url.searchParams.get("token");
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export function attachChatWs(server: Server, cfg: Config, cwd: string): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/vaidya/chat" });

  wss.on("connection", async (ws, req) => {
    const token = tokenFromReq(req);
    const userId = token ? await authUserId(token) : null;
    if (userId == null) {
      send(ws, { type: "error", message: "unauthenticated" });
      ws.close(4001, "unauthenticated");
      return;
    }

    // One persistent session per socket, with a block collector for gen-UI.
    const collector = new BlockCollector();
    let session: Awaited<ReturnType<typeof buildSession>>;
    try {
      session = await buildSession(cfg, {
        systemPrompt: loadPrompt("chat"),
        cwd,
        sessionManager: SessionManager.create(cwd),
        blockCollector: collector,
      });
    } catch (err) {
      send(ws, { type: "error", message: `session init failed: ${String(err)}` });
      ws.close(1011, "init failed");
      return;
    }

    // Stream session events to the socket.
    session.subscribe((e: any) => {
      if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
        send(ws, { type: "token", delta: e.assistantMessageEvent.delta });
      } else if (e.type === "tool_execution_start") {
        send(ws, { type: "tool", name: e.toolName });
        // Forward a block the instant it's collected (length grew on this call).
      }
    });

    let busy = false;
    ws.on("message", async (raw) => {
      let text: string;
      try {
        const parsed = JSON.parse(raw.toString());
        text = String(parsed.message ?? parsed.text ?? "");
      } catch {
        text = raw.toString();
      }
      if (!text.trim()) return;
      if (busy) {
        send(ws, { type: "error", message: "still answering the previous message" });
        return;
      }
      busy = true;
      const before = collector.blocks.length;
      try {
        await session.prompt(`I am user_id ${userId}. ${text}`);
        // Emit any blocks produced this turn (in order).
        for (const b of collector.blocks.slice(before)) send(ws, { type: "block", block: b });
        send(ws, { type: "done" });
      } catch (err) {
        send(ws, { type: "error", message: String(err) });
      } finally {
        busy = false;
      }
    });

    ws.on("close", () => {
      session.dispose();
    });
  });

  return wss;
}
