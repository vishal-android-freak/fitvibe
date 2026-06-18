import {
  getAuth,
  signInWithCustomToken as fbSignInWithCustomToken,
  signOut as fbSignOut,
} from '@react-native-firebase/auth';

/**
 * Firebase auth wrapper (react-native-firebase, modular API per v22+). After
 * the Google OAuth flow, the backend mints a custom token (uid = google user
 * id); we sign in with it here, then attach the resulting ID token as a Bearer
 * to every API request.
 *
 * NOTE: react-native-firebase is a native module — it requires a dev build with
 * google-services.json / GoogleService-Info.plist, not Expo Go.
 */

/** Sign in with the backend-minted custom token. */
export async function signInWithCustomToken(customToken: string): Promise<void> {
  await fbSignInWithCustomToken(getAuth(), customToken);
}

/** Current Firebase ID token (JWT) for Authorization headers, or null if signed
 *  out. forceRefresh bypasses the cached token after a 401. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/** Whether a Firebase user is currently signed in. */
export function isSignedIn(): boolean {
  return getAuth().currentUser != null;
}

/** Sign out of Firebase (paired with clearing our own session). */
export async function firebaseSignOut(): Promise<void> {
  if (getAuth().currentUser) await fbSignOut(getAuth());
}
