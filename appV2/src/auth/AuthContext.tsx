import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { config, REDIRECT_PATH } from './config';
import { redeemSession } from './session';
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

  const redirectUri = useMemo(() => makeRedirectUri({ scheme: 'fitvibe', path: REDIRECT_PATH }), []);

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

    setError(null);
    try {
      if (params.error) throw new Error(humanizeError(params.error));
      if (!params.token) throw new Error('No session token returned');

      const data = await redeemSession(params.token);
      const next: Session = {
        userId: data.user_id,
        healthUserId: data.health_user_id,
        googleUserId: data.google_user_id,
      };
      await saveSession(next);
      setSession(next);
      setStatus('signedIn');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setStatus('signedOut');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The backend brokers the whole OAuth handshake. We open its /auth/start,
      // it bounces through Google and its own /auth/callback, then deep-links
      // back to us at fitvibe://oauthredirect with a one-time token (no code or
      // secret ever touches the app).
      const startUrl = `${config.apiBaseUrl}/auth/start?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

      // On Android/Expo Router the deep link is usually consumed by the router
      // (the /oauthredirect route finishes the flow), so a 'dismiss' here is
      // normal — don't treat it as an error. Only complete inline if we got the
      // URL back directly.
      if (result.type === 'success') {
        await completeSignIn(parseQuery(result.url));
      } else {
        setBusy(false);
      }
    } catch {
      // completeSignIn already set the error/busy state.
    }
  }, [busy, redirectUri, completeSignIn]);

  const signOut = useCallback(async () => {
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

/** Parse the query string off a returned deep link (e.g. fitvibe://oauthredirect?token=…&error=…). */
function parseQuery(returnUrl: string): { token?: string; error?: string; state?: string } {
  const q = returnUrl.split('?')[1];
  if (!q) return {};
  const out: Record<string, string> = {};
  for (const pair of q.split('&')) {
    const [k, v = ''] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
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
