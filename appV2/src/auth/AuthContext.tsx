import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  signIn: () => Promise<void>;
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

  const signIn = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The backend brokers the whole OAuth handshake. We open its /auth/start,
      // it bounces through Google and its own /auth/callback, then deep-links
      // back to us with a one-time token (no code/secret ever touches the app).
      const startUrl = `${config.apiBaseUrl}/auth/start?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

      if (result.type !== 'success') {
        return; // cancel / dismiss — stay on welcome, no error
      }

      const params = parseQuery(result.url);
      if (params.error) throw new Error(humanizeError(params.error));
      const token = params.token;
      if (!token) throw new Error('No session token returned');

      const data = await redeemSession(token);
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
    } finally {
      setBusy(false);
    }
  }, [busy, redirectUri]);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, busy, error, signIn, signOut }),
    [status, session, busy, error, signIn, signOut],
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
