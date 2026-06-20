/**
 * vaidya_insights CRUD. We store ONLY the Pi session id + metadata; the rendered
 * blocks are recovered by replaying the session via the Pi SDK (see pi/replay).
 */

import { db } from "./db.js";

export type InsightType = "sleep" | "today_insight" | "day_insight";

export interface InsightRow {
  id: number;
  userId: number;
  type: InsightType;
  civilDate: string;
  sleepDataPointId: number | null;
  piSessionId: string;
  createdAt: string;
}

/** Record (or replace) the insight for (user, type, day[, sleep session]). */
export async function recordInsight(args: {
  userId: number;
  type: InsightType;
  civilDate: string;
  sleepDataPointId?: number | null;
  piSessionId: string;
}): Promise<void> {
  await db().query(
    `INSERT INTO vaidya_insights (user_id, type, civil_date, sleep_data_point_id, pi_session_id)
     VALUES ($1, $2, $3::date, $4, $5)
     ON CONFLICT (user_id, type, civil_date, sleep_data_point_id)
       DO UPDATE SET pi_session_id = EXCLUDED.pi_session_id, created_at = now()`,
    [args.userId, args.type, args.civilDate, args.sleepDataPointId ?? null, args.piSessionId],
  );
}

function mapRow(r: any): InsightRow {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    type: r.type,
    civilDate: r.civil_date instanceof Date ? r.civil_date.toISOString().slice(0, 10) : String(r.civil_date),
    sleepDataPointId: r.sleep_data_point_id == null ? null : Number(r.sleep_data_point_id),
    piSessionId: r.pi_session_id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

/** Latest insight of a type for a user, optionally pinned to a civil date.
 *  When date is omitted, returns the most recent of that type. */
export async function latestInsight(
  userId: number,
  type: InsightType,
  civilDate?: string,
): Promise<InsightRow | null> {
  const r = civilDate
    ? await db().query(
        `SELECT * FROM vaidya_insights
         WHERE user_id = $1 AND type = $2 AND civil_date = $3::date
         ORDER BY created_at DESC LIMIT 1`,
        [userId, type, civilDate],
      )
    : await db().query(
        `SELECT * FROM vaidya_insights
         WHERE user_id = $1 AND type = $2
         ORDER BY civil_date DESC, created_at DESC LIMIT 1`,
        [userId, type],
      );
  return r.rows[0] ? mapRow(r.rows[0]) : null;
}

/** Which sleep sessions on a civil date already have a sleep insight (for the
 *  sleep-watch cron's idempotency). */
export async function sleepInsightDataPointIds(
  userId: number,
  civilDate: string,
): Promise<Set<number>> {
  const r = await db().query<{ sleep_data_point_id: string }>(
    `SELECT sleep_data_point_id FROM vaidya_insights
     WHERE user_id = $1 AND type = 'sleep' AND civil_date = $2::date
       AND sleep_data_point_id IS NOT NULL`,
    [userId, civilDate],
  );
  return new Set(r.rows.map((row) => Number(row.sleep_data_point_id)));
}
