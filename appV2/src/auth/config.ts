/**
 * OAuth + backend configuration, read from EXPO_PUBLIC_* env vars at build time
 * (set in .env / app config). The Google client ID must be an iOS/Android-type
 * OAuth client whose authorized redirect URI matches `fitvibe://oauthredirect`.
 */
export const config = {
  /** FitVibe Go backend base URL (no trailing slash). */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  /** Google OAuth client ID (iOS/Android type — no secret on device). */
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
};

/** Google's OAuth 2.0 authorization endpoint. */
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/** App custom-scheme redirect path; combined with the `fitvibe` scheme. */
export const REDIRECT_PATH = 'oauthredirect';

/**
 * Scopes requested at consent. Mirrors the backend's healthScopes
 * (internal/oauth/google.go) so the granted token covers everything the
 * sync layer reads/writes.
 */
export const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.writeonly',
  'https://www.googleapis.com/auth/googlehealth.nutrition.readonly',
  'https://www.googleapis.com/auth/googlehealth.nutrition.writeonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.writeonly',
  'https://www.googleapis.com/auth/googlehealth.ecg.readonly',
  'https://www.googleapis.com/auth/googlehealth.irn.readonly',
  'https://www.googleapis.com/auth/googlehealth.location.readonly',
  'https://www.googleapis.com/auth/googlehealth.profile.readonly',
  'https://www.googleapis.com/auth/googlehealth.profile.writeonly',
  'https://www.googleapis.com/auth/googlehealth.settings.readonly',
  'https://www.googleapis.com/auth/googlehealth.settings.writeonly',
];
