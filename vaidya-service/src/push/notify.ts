/**
 * Expo push notifications. Stores per-user device tokens (multiple per user) and
 * sends a push via the Expo push service (expo-server-sdk) when a cron generates
 * an insight. The notification carries a `tab` so the app deep-links to the right
 * screen on tap.
 */

import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { db } from "../store/db.js";
import type { InsightType } from "../store/insights.js";

const expo = new Expo();

/** Register (upsert) a device's Expo push token for a user. */
export async function registerToken(userId: number, token: string, platform?: string): Promise<void> {
  if (!Expo.isExpoPushToken(token)) throw new Error("invalid Expo push token");
  await db().query(
    `INSERT INTO vaidya_push_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id,
       platform = EXCLUDED.platform, last_seen_at = now()`,
    [userId, token, platform ?? null],
  );
}

/** Remove a device token (opt-out / sign-out). */
export async function unregisterToken(token: string): Promise<void> {
  await db().query(`DELETE FROM vaidya_push_tokens WHERE token = $1`, [token]);
}

async function tokensForUser(userId: number): Promise<string[]> {
  const r = await db().query<{ token: string }>(
    `SELECT token FROM vaidya_push_tokens WHERE user_id = $1`,
    [userId],
  );
  return r.rows.map((x) => x.token);
}

/** Which app tab a cron type deep-links to, plus the notification copy. */
const NOTIF: Record<InsightType, { tab: string; title: string; body: string }> = {
  today_insight: { tab: "today", title: "Your Today update", body: "Vaidya has a fresh read on your day." },
  sleep: { tab: "sleep", title: "Sleep analyzed", body: "Vaidya broke down your latest sleep." },
  day_insight: { tab: "insights", title: "Your daily report is ready", body: "Tonight's insights — trends, flags, and what to act on." },
};

/**
 * Send a push to all of a user's devices for a generated insight. Best-effort:
 * logs failures, prunes tokens Expo reports as unregistered (DeviceNotRegistered).
 */
export async function notifyInsight(userId: number, type: InsightType, log?: (m: string) => void): Promise<void> {
  const tokens = await tokensForUser(userId);
  if (!tokens.length) return;
  const meta = NOTIF[type];

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t))
    .map((to) => ({
      to,
      sound: "default",
      title: meta.title,
      body: meta.body,
      data: { tab: meta.tab, type },
      channelId: "default",
    }));
  if (!messages.length) return;

  try {
    // Send per chunk and pair each ticket with the token that produced it
    // (tickets come back in send order, chunk-local) so pruning the bad ones
    // doesn't depend on a global index lining up with `messages`.
    for (const chunk of expo.chunkPushNotifications(messages)) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const bad = chunk[i]?.to as string;
          if (bad) void unregisterToken(bad);
        }
      });
    }
    log?.(`pushed ${type} to ${messages.length} device(s) for u${userId}`);
  } catch (err) {
    log?.(`push ${type} u${userId} failed: ${String(err)}`);
  }
}
