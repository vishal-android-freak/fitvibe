/**
 * Cron scheduler for the insight jobs. Schedules:
 *   - sleep-watch : every 30 min (detect new sleep sessions through the day)
 *   - today       : every 3 hours (Today headline)
 *   - day         : 23:00 daily (detailed day report)
 *
 * Each job is wrapped so it never overlaps itself (a long LLM run won't stack).
 * Schedules are server-local-time triggers; per-user local day is handled inside
 * each job via the offset trick.
 */

import cron from "node-cron";
import type { Config } from "../config.js";
import { runSleepWatch, runTodayInsight, runDayInsight } from "./jobs.js";

function guard(name: string, fn: (ctx: { cfg: Config; cwd: string; log: (m: string) => void }) => Promise<void>, cfg: Config, cwd: string) {
  let running = false;
  return async () => {
    if (running) {
      console.log(`[cron ${name}] previous run still in progress, skipping`);
      return;
    }
    running = true;
    const log = (m: string) => console.log(`[cron ${name}] ${m}`);
    log("start");
    try {
      await fn({ cfg, cwd, log });
      log("done");
    } catch (err) {
      log(`crashed: ${String(err)}`);
    } finally {
      running = false;
    }
  };
}

export function startCrons(cfg: Config, cwd: string): void {
  const sleepWatch = guard("sleep-watch", runSleepWatch, cfg, cwd);
  const today = guard("today", runTodayInsight, cfg, cwd);
  const day = guard("day", runDayInsight, cfg, cwd);

  cron.schedule("*/30 * * * *", sleepWatch);
  cron.schedule("0 */3 * * *", today);
  cron.schedule("0 23 * * *", day);

  console.log("[cron] scheduled: sleep-watch (*/30m), today (every 3h), day (23:00)");
}

// Re-export the job runners so a CLI / test can trigger one on demand.
export { runSleepWatch, runTodayInsight, runDayInsight };
