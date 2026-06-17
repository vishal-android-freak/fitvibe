import { config } from './config';

/** Response from the backend POST /auth/exchange (mirrors oauth.ExchangeResponse). */
export interface ExchangeResponse {
  user_id: number;
  health_user_id: string;
  google_user_id: string;
  legacy_user_id: string;
}

/**
 * Hands the Google authorization code (and the exact redirect URI used to obtain
 * it) to the backend, which exchanges it for tokens server-side and returns the
 * user identity. The redirect URI MUST match what Google saw during authorization.
 */
export async function exchangeCode(code: string, redirectUri: string): Promise<ExchangeResponse> {
  const res = await fetch(`${config.apiBaseUrl}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `Exchange failed (HTTP ${res.status})`);
  }

  return (await res.json()) as ExchangeResponse;
}
