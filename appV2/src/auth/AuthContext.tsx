import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { parse } from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { APP_SCHEME, config, REDIRECT_PATH } from './config';
import { redeemSession, toSession } from './session';
import { signInWithCustomToken, firebaseSignOut } from './firebase';
import { clearSession, loadSession, saveSession, type Session } from './storage';

// Ensures any lingering auth browser session is completed on cold start.
WebBrowser.maybeCompleteAuthSession();

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /** in-flight sign-in (browser open or token redemption) */
  busy: boolean;
  /** last sign-in error message, if any */
  error: string | null;
  /** opens the backend-brokered OAuth flow in the browser */
  signIn: () => Promise<void>;
  /** completes sign-in from the deep-link redirect: redeem token, persist */
  completeSignIn: (params: { token?: string; error?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = useMemo(() => makeRedirectUri({ scheme: APP_SCHEME, path: REDIRECT_PATH }), []);

  // Restore any persisted session on boot.
  useEffect(() => {
    let active = true;
    loadSession().then((s) => {
      if (!active) return;
      setSession(s);
      setStatus(s ? 'signedIn' : 'signedOut');
    });
    return () => {
      active = false;
    };
  }, []);

  // Redeem the one-time token for the identity and persist the session. Called
  // either from the deep-link redirect route (the normal path on Android, where
  // Expo Router handles the incoming link) or directly from signIn() if
  // openAuthSessionAsync happens to resolve with the URL first.
  const redeemingRef = useRef<string | null>(null);

  const completeSignIn = useCallback(async (params: { token?: string; error?: string }) => {
    // Guard against double redemption: the one-time token can arrive both via
    // the deep-link route and openAuthSessionAsync's resolved URL. Whichever
    // fires first wins; the second is a no-op.
    if (params.token && redeemingRef.current === params.token) return;
    if (params.token) redeemingRef.current = params.token;

    setBusy(true);
    setError(null);
    try {
      if (params.error) throw new Error(humanizeError(params.error));
      if (!params.token) throw new Error('No session token returned');

      const data = await redeemSession(params.token);
      // Sign into Firebase with the backend-minted custom token so subsequent
      // API requests carry a verifiable Bearer ID token (no extra user step).
      if (data.firebase_token) {
        await signInWithCustomToken(data.firebase_token);
      }
      await saveSession(toSession(data));
      setSession(toSession(data));
      setStatus('signedIn');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setStatus('signedOut');
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // The backend brokers the whole OAuth handshake. We open its /auth/start,
    // it bounces through Google and its own /auth/callback, then deep-links back
    // to us at <scheme>://oauthredirect with a one-time token (no code or secret
    // ever touches the app).
    const startUrl = `${config.apiBaseUrl}/auth/start?redirect=${encodeURIComponent(redirectUri)}`;
    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

    // On Android/Expo Router the deep link is usually consumed by the router
    // (the /oauthredirect route finishes the flow), so a non-success result here
    // is normal — not an error. Only complete inline if we got the URL directly.
    if (result.type === 'success') {
      const { queryParams } = parse(result.url);
      await completeSignIn({ token: str(queryParams?.token), error: str(queryParams?.error) });
    } else {
      setBusy(false);
    }
  }, [busy, redirectUri, completeSignIn]);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    await clearSession();
    setSession(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, busy, error, signIn, completeSignIn, signOut }),
    [status, session, busy, error, signIn, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Narrow a parsed query-param value (string | string[] | undefined) to a string. */
function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function humanizeError(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'Sign-in was cancelled';
    case 'missing_code':
    case 'exchange_failed':
      return "Couldn't complete sign-in with Google";
    default:
      return 'Sign-in failed';
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
