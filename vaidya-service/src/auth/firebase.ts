/**
 * Firebase ID-token verification — mirrors the Go authmw (uid = google_user_id).
 * The app sends `Authorization: Bearer <Firebase ID token>`; we verify it, map
 * the uid to the internal user id, and that's the authenticated user. Same
 * Firebase project + service account as the Go server.
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Config } from "../config.js";
import { userIdByGoogleUserId } from "../store/db.js";

let ready = false;

export function initFirebase(cfg: Config): void {
  if (ready || getApps().length) {
    ready = true;
    return;
  }
  const credential = cfg.firebaseCredentialsFile
    ? cert(JSON.parse(readFileSync(cfg.firebaseCredentialsFile, "utf8")))
    : applicationDefault();
  initializeApp({ credential, projectId: cfg.firebaseProjectId || undefined });
  ready = true;
}

/** Verify an ID token → Firebase uid (= google_user_id). Throws on invalid. */
export async function verifyIdToken(idToken: string): Promise<string> {
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
}

/** Verify the token and resolve to the internal user id. Returns null when the
 *  token is invalid or the user isn't found. */
export async function authUserId(idToken: string): Promise<number | null> {
  let uid: string;
  try {
    uid = await verifyIdToken(idToken);
  } catch {
    return null;
  }
  return userIdByGoogleUserId(uid);
}

/** Pull a bearer token from an Authorization header value. */
export function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1] : null;
}
