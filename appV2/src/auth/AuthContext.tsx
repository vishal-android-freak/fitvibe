import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
  type AuthRequestPromptOptions,
} from 'expo-auth-session';
import { config, GOOGLE_AUTH_ENDPOINT, REDIRECT_PATH, SCOPES } from './config';
import { exchangeCode } from './exchange';
import { clearSession, loadSession, saveSession, type Session } from './storage';

// Required for the auth browser to dismiss correctly when control returns.
WebBrowser.maybeCompleteAuthSession();

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /** in-flight sign-in (browser open or code exchange) */
  busy: boolean;
  /** last sign-in error message, if any */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const discovery = { authorizationEndpoint: GOOGLE_AUTH_ENDPOINT };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = useMemo(() => makeRedirectUri({ scheme: 'fitvibe', path: REDIRECT_PATH }), []);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: config.googleClientId,
      responseType: ResponseType.Code,
      scopes: SCOPES,
      redirectUri,
      // Offline access + forced consent so Google returns a refresh token,
      // which the backend requires.
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery,
  );

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
    if (!request || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await promptAsync({ showInRecents: true } as AuthRequestPromptOptions);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return; // user backed out — stay on welcome, no error
      }
      if (result.type !== 'success' || !result.params.code) {
        throw new Error(result.type === 'error' ? result.params.error_description || 'Authorization failed' : 'Authorization failed');
      }

      const data = await exchangeCode(result.params.code, redirectUri);
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
  }, [request, busy, promptAsync, redirectUri]);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
