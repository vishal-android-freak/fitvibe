import auth from '@react-native-firebase/auth';

/**
 * Firebase auth wrapper (react-native-firebase). After the Google OAuth flow,
 * the backend mints a custom token (uid = google user id); we sign in with it
 * here, then attach the resulting ID token as a Bearer to every API request.
 *
 * NOTE: react-native-firebase is a native module — it requires a dev build with
 * google-services.json / GoogleService-Info.plist, not Expo Go.
 */

/** Sign in with the backend-minted custom token. Idempotent-ish: signing in
 *  again just refreshes the Firebase user. */
export async function signInWithCustomToken(customToken: string): Promise<void> {
  await auth().signInWithCustomToken(customToken);
}

/** Current Firebase ID token (JWT) for Authorization headers, or null if signed
 *  out. forceRefresh lets callers bypass the cached token after a 401. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** Whether a Firebase user is currently signed in. */
export function isSignedIn(): boolean {
  return auth().currentUser != null;
}

/** Sign out of Firebase (paired with clearing our own session). */
export async function firebaseSignOut(): Promise<void> {
  if (auth().currentUser) await auth().signOut();
}
