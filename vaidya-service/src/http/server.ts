/**
 * HTTP API for the app to pull pre-generated insights. Firebase-guarded (same
 * project as Go; nginx will unify /me/* and /vaidya/* later). Each endpoint
 * finds the latest vaidya_insights row of its type, replays the stored Pi
 * session, and returns the rendered blocks + narrative text.
 */

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { Config } from "../config.js";
import { authUserId, bearer } from "../auth/firebase.js";
import { latestInsight, type InsightType } from "../store/insights.js";
import { replaySession } from "../pi/replay.js";

/** Resolve the authenticated user id from the request, or 401. */
async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<number | null> {
  const token = bearer(req.headers.authorization);
  if (!token) {
    reply.code(401).send({ error: "missing bearer token" });
    return null;
  }
  const userId = await authUserId(token);
  if (userId == null) {
    reply.code(401).send({ error: "invalid token" });
    return null;
  }
  return userId;
}

/** Look up the latest insight of a type, replay it, return { blocks, text } or 404. */
async function serveInsight(
  cwd: string,
  userId: number,
  type: InsightType,
  reply: FastifyReply,
  civilDate?: string,
) {
  const row = await latestInsight(userId, type, civilDate);
  if (!row) {
    reply.code(404).send({ error: "no insight yet" });
    return;
  }
  const { blocks, text } = await replaySession(cwd, row.piSessionId);
  reply.send({
    type: row.type,
    date: row.civilDate,
    blocks,
    text,
    generatedAt: row.createdAt,
  });
}

export function buildHttpServer(cfg: Config, cwd: string): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/vaidya/insights/today", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (userId == null) return;
    await serveInsight(cwd, userId, "today_insight", reply);
  });

  app.get<{ Params: { date?: string } }>("/vaidya/insights/sleep/:date?", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (userId == null) return;
    await serveInsight(cwd, userId, "sleep", reply, req.params.date);
  });

  app.get<{ Params: { date?: string } }>("/vaidya/insights/day/:date?", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (userId == null) return;
    await serveInsight(cwd, userId, "day_insight", reply, req.params.date);
  });

  return app;
}
