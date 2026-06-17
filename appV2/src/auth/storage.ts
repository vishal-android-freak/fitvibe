import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'fitvibe.session.v1';

/** The persisted session — enough to know the user is signed in and who they are.
 *  Tokens live server-side; the app only keeps identity + profile for display. */
export interface Session {
  userId: number;
  healthUserId: string;
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

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
