/**
 * Shared insight-generation helper for the crons. Builds a persisted Pi session
 * with the task-specific prompt + gen-UI tools, runs one prompt to completion,
 * and records the session id in vaidya_insights (content is replayed later).
 */

import { SessionManager } from "@earendil-works/pi-coding-agent";
import type { Config } from "../config.js";
import { buildSession } from "../pi/agent.js";
import { loadPrompt, type PromptName } from "../prompts/load.js";
import { BlockCollector } from "../tools/genui.js";
import { recordInsight, type InsightType } from "../store/insights.js";

export interface GenerateArgs {
  cfg: Config;
  cwd: string;
  userId: number;
  prompt: PromptName; // which system prompt (today | sleep | day)
  task: string; // the user-turn instruction
  type: InsightType; // vaidya_insights.type
  civilDate: string;
  sleepDataPointId?: number | null;
}

export interface GenerateResult {
  sessionId: string;
  blockCount: number;
}

/** Generate one insight, persist its session id. Returns the session id +
 *  how many blocks were emitted (for logging). */
export async function generateInsight(args: GenerateArgs): Promise<GenerateResult> {
  const collector = new BlockCollector();
  const session = await buildSession(args.cfg, {
    systemPrompt: loadPrompt(args.prompt),
    cwd: args.cwd,
    sessionManager: SessionManager.create(args.cwd),
    blockCollector: collector,
  });
  try {
    await session.prompt(args.task);
    const sessionId = session.sessionId;
    await recordInsight({
      userId: args.userId,
      type: args.type,
      civilDate: args.civilDate,
      sleepDataPointId: args.sleepDataPointId ?? null,
      piSessionId: sessionId,
    });
    return { sessionId, blockCount: collector.blocks.length };
  } finally {
    session.dispose();
  }
}
