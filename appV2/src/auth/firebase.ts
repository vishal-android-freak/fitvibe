import {
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
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

/** The signed-in user's profile, read straight off the Firebase user (which is
 *  populated from the Google identity). uid = google user id. */
export interface FirebaseProfile {
  uid: string;
  displayName: string;
  email: string;
  picture: string;
}

/**
 * Subscribe to Firebase auth-state changes — the source of truth for whether
 * the user is logged in. Fires once on boot with the restored user (or null)
 * and on every sign-in/sign-out/token-revocation. Returns an unsubscribe fn.
 */
export function onAuthState(cb: (profile: FirebaseProfile | null) => void): () => void {
  return fbOnAuthStateChanged(getAuth(), (user) => {
    cb(
      user
        ? {
            uid: user.uid,
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            picture: user.photoURL ?? '',
          }
        : null,
    );
  });
}

/** Sign out of Firebase (paired with clearing our own session). */
export async function firebaseSignOut(): Promise<void> {
  if (getAuth().currentUser) await fbSignOut(getAuth());
}
