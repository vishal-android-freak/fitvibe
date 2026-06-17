/**
 * Backend configuration. In the brokered OAuth flow the backend owns the Google
 * client (id + secret) and scopes; the app only needs the backend base URL and
 * its own deep-link scheme. So no Google client ID ships in the app.
 */
export const config = {
  /** FitVibe Go backend base URL (no trailing slash). */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
};

/** App custom-scheme redirect path; combined with the `fitvibe` scheme. */
export const REDIRECT_PATH = 'oauthredirect';
