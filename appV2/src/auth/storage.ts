/**
 * The in-memory session profile for display. Auth state + identity now come
 * from Firebase (the source of truth); there is NO local persistence — Firebase
 * restores the session natively on boot. Tokens live server-side.
 */
export interface Session {
  /** Google user id (= Firebase uid). */
  googleUserId: string;
  /** Google display name, e.g. "Maya Okonkwo" (may be empty). */
  displayName: string;
  email: string;
  /** Google profile picture URL (may be empty). */
  picture: string;
}

/** First name for greetings, derived from the display name (falls back to "there"). */
export function firstName(session: Session | null): string {
  const name = session?.displayName?.trim();
  if (!name) return 'there';
  return name.split(/\s+/)[0];
}
