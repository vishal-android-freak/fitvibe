import { apiGet } from '@/data/api';
import type { Session } from './storage';

/** Identity + profile returned by the backend (mirrors oauth.ExchangeResponse). */
export interface SessionResponse {
  user_id: number;
  health_user_id: string;
  google_user_id: string;
  legacy_user_id: string;
  display_name: string;
  email: string;
  picture: string;
}

/** Map the backend's wire shape to the persisted Session (the one place this
 *  snake_case → camelCase remap lives). */
export function toSession(r: SessionResponse): Session {
  return {
    userId: r.user_id,
    healthUserId: r.health_user_id,
    googleUserId: r.google_user_id,
    displayName: r.display_name,
    email: r.email,
    picture: r.picture,
  };
}

/**
 * Redeems the one-time token the backend deep-linked back to the app for the
 * user's identity. The token is single-use and short-lived server-side.
 */
export async function redeemSession(token: string): Promise<SessionResponse> {
  return apiGet<SessionResponse>(`/auth/session?token=${encodeURIComponent(token)}`);
}
