/**
 * The three insight crons. Each iterates active users, honors each user's local
 * civil day, and is safe to re-run (idempotent via the vaidya_insights unique
 * index / explicit skip checks).
 */

import type { Config } from "../config.js";
import { activeUserIds, localDate, sleepSessionsForDate } from "../store/db.js";
import { sleepInsightDataPointIds, latestInsight } from "../store/insights.js";
import { generateInsight } from "./generate.js";

type Ctx = { cfg: Config; cwd: string; log: (m: string) => void };

/** sleep-watch: for each new sleep session today without an insight, generate one. */
export async function runSleepWatch({ cfg, cwd, log }: Ctx): Promise<void> {
  for (const userId of await activeUserIds()) {
    const date = await localDate(userId);
    const sessions = await sleepSessionsForDate(userId, date);
    if (!sessions.length) continue;
    const done = await sleepInsightDataPointIds(userId, date);
    for (const dpId of sessions) {
      if (done.has(dpId)) continue;
      try {
        const r = await generateInsight({
          cfg, cwd, userId, prompt: "sleep", type: "sleep", civilDate: date,
          sleepDataPointId: dpId,
          task: `Generate the per-sleep insight for user_id ${userId}, for the sleep session with data_point_id ${dpId} (civil date ${date}). Use real data.`,
        });
        log(`sleep insight u${userId} dp${dpId}: ${r.blockCount} blocks (${r.sessionId})`);
      } catch (err) {
        log(`sleep insight u${userId} dp${dpId} FAILED: ${String(err)}`);
      }
    }
  }
}

/** today-headline: a fresh 2-line headline per user (replaces the day's prior). */
export async function runTodayInsight({ cfg, cwd, log }: Ctx): Promise<void> {
  for (const userId of await activeUserIds()) {
    const date = await localDate(userId);
    try {
      const r = await generateInsight({
        cfg, cwd, userId, prompt: "today", type: "today_insight", civilDate: date,
        task: `Generate the Today headline for user_id ${userId} for ${date}. Use real, current data.`,
      });
      log(`today insight u${userId}: ${r.blockCount} blocks (${r.sessionId})`);
    } catch (err) {
      log(`today insight u${userId} FAILED: ${String(err)}`);
    }
  }
}

/** day-report: one detailed end-of-day report per user (once per day). */
export async function runDayInsight({ cfg, cwd, log }: Ctx): Promise<void> {
  for (const userId of await activeUserIds()) {
    const date = await localDate(userId);
    const existing = await latestInsight(userId, "day_insight", date);
    if (existing) {
      log(`day insight u${userId} already done for ${date}, skipping`);
      continue;
    }
    try {
      const r = await generateInsight({
        cfg, cwd, userId, prompt: "day", type: "day_insight", civilDate: date,
        task: `Generate the detailed end-of-day report for user_id ${userId} for ${date}. Use real data.`,
      });
      log(`day insight u${userId}: ${r.blockCount} blocks (${r.sessionId})`);
    } catch (err) {
      log(`day insight u${userId} FAILED: ${String(err)}`);
    }
  }
}
