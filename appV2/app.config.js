// Dynamic Expo config: starts from app.json and points the Firebase native
// config files at EAS "file" env vars when present (EAS materializes the
// uploaded google-services.json / GoogleService-Info.plist to a path and sets
// these env vars to it), falling back to the local files for `expo prebuild`
// and local dev builds.
//
// EAS dashboard → Environment Variables (Secret, type File):
//   GOOGLE_SERVICES_JSON   → google-services.json
//   GOOGLE_SERVICES_PLIST  → GoogleService-Info.plist

module.exports = ({ config }) => {
  const androidGoogleServices = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
  const iosGoogleServices = process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist';

  return {
    ...config,
    ios: {
      ...config.ios,
      googleServicesFile: iosGoogleServices,
    },
    android: {
      ...config.android,
      googleServicesFile: androidGoogleServices,
    },
  };
};
