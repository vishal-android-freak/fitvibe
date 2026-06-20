/**
 * The three insight crons. Each iterates active users, honors each user's local
 * civil day, and is safe to re-run (idempotent via the vaidya_insights unique
 * index / explicit skip checks).
 */

import type { Config } from "../config.js";
import { activeUserIds, localDate, sleepSessionsForDate } from "../store/db.js";
import { sleepInsightDataPointIds, latestInsight } from "../store/insights.js";
import { generateInsight } from "./generate.js";
import { notifyInsight } from "../push/notify.js";

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
        await notifyInsight(userId, "sleep", log);
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
      await notifyInsight(userId, "today_insight", log);
    } catch (err) {
      log(`today insight u${userId} FAILED: ${String(err)}`);
    }
  }
}

/** day-report: ONE detailed end-of-day report per user. Runs at ~11pm. Generated
 *  once per day, and only after the day's data is complete — we gate on today's
 *  sleep having synced (the day-in-review anchors on last night's sleep), so an
 *  early/partial run doesn't produce a stale report. The next run that night
 *  picks it up once the data is in. */
export async function runDayInsight({ cfg, cwd, log }: Ctx): Promise<void> {
  for (const userId of await activeUserIds()) {
    const date = await localDate(userId);
    const existing = await latestInsight(userId, "day_insight", date);
    if (existing) {
      log(`day insight u${userId} already done for ${date}, skipping`);
      continue;
    }
    // Don't generate until today's data is complete — require today's sleep.
    const sleeps = await sleepSessionsForDate(userId, date);
    if (sleeps.length === 0) {
      log(`day insight u${userId} deferred for ${date} — no sleep data yet`);
      continue;
    }
    try {
      const r = await generateInsight({
        cfg, cwd, userId, prompt: "day", type: "day_insight", civilDate: date,
        task: `Generate the detailed end-of-day report for user_id ${userId} for ${date}. Use real data.`,
      });
      log(`day insight u${userId}: ${r.blockCount} blocks (${r.sessionId})`);
      await notifyInsight(userId, "day_insight", log);
    } catch (err) {
      log(`day insight u${userId} FAILED: ${String(err)}`);
    }
  }
}
