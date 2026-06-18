import { apiGet } from '@/data/api';
import type { Session } from './storage';

/** Authenticated profile from GET /me/profile (display fields, no tokens). */
interface ProfileResponse {
  userId: number;
  googleUserId: string;
  displayName: string;
  email: string;
  picture: string;
  age?: number;
}

/** Fetch the signed-in user's profile (Bearer-authenticated). The user is
 *  derived server-side from the token, so no id is passed. */
export async function fetchProfile(): Promise<Session> {
  const p = await apiGet<ProfileResponse>('/me/profile');
  return { googleUserId: p.googleUserId, displayName: p.displayName, email: p.email, picture: p.picture };
}

/** The one-time-token redemption result (mirrors oauth.ExchangeResponse). We
 *  only consume firebase_token now; the profile comes from GET /me/profile. */
export interface SessionResponse {
  firebase_token?: string;
}

/**
 * Redeems the one-time token the backend deep-linked back to the app for the
 * Firebase custom token. The token is single-use and short-lived server-side.
 */
export async function redeemSession(token: string): Promise<SessionResponse> {
  return apiGet<SessionResponse>(`/auth/session?token=${encodeURIComponent(token)}`);
}
