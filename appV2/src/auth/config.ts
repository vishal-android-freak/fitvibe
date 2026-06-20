import Constants from 'expo-constants';

/**
 * Backend configuration. In the brokered OAuth flow the backend owns the Google
 * client (id + secret) and scopes; the app only needs the backend base URL and
 * its own deep-link scheme. So no Google client ID ships in the app.
 */
export const config = {
  /** FitVibe Go backend base URL (no trailing slash). */
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  /** Vaidya agent service base URL. In prod nginx fronts both Go and Vaidya at
   *  one origin, so set this equal to apiBaseUrl; in dev they're separate ports. */
  vaidyaBaseUrl: process.env.EXPO_PUBLIC_VAIDYA_BASE_URL ?? 'http://localhost:8090',
};

/** The app's custom URL scheme — single source is app.json's `scheme`. */
export const APP_SCHEME = ((): string => {
  const scheme = Constants.expoConfig?.scheme;
  return (Array.isArray(scheme) ? scheme[0] : scheme) ?? 'fitvibe';
})();

/** App custom-scheme redirect path; combined with APP_SCHEME → fitvibe://oauthredirect. */
export const REDIRECT_PATH = 'oauthredirect';
