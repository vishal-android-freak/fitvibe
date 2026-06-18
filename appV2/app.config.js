// Dynamic Expo config:
//  1. Points the Firebase native config files at EAS "file" env vars when
//     present (EAS materializes the uploaded google-services.json /
//     GoogleService-Info.plist to a path), falling back to the local files for
//     `expo prebuild` and local dev builds.
//       EAS dashboard → Environment Variables (Secret, type File):
//         FITVIBE_GOOGLE_SERVICES_JSON   → google-services.json
//         FITVIBE_GOOGLE_SERVICES_PLIST  → GoogleService-Info.plist
//  2. Adds expo-build-properties, trimming Android ABIs per EAS build profile to
//     cut native build time: dev/preview compile arm64-v8a only (all modern
//     real devices + Apple-silicon emulators), while production (and any
//     non-EAS/local build) keeps the full set so the Play Store serves every
//     device. iOS uses static frameworks (required by react-native-firebase).

const ALL_ANDROID_ARCHS = ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'];
const FAST_ANDROID_ARCHS = ['arm64-v8a'];

module.exports = ({ config }) => {
  const androidGoogleServices = process.env.FITVIBE_GOOGLE_SERVICES_JSON ?? './google-services.json';
  const iosGoogleServices = process.env.FITVIBE_GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist';

  // EAS sets EAS_BUILD_PROFILE to the profile name; absent for local builds.
  const profile = process.env.EAS_BUILD_PROFILE;
  const fastArchs = profile === 'development' || profile === 'preview';
  const buildArchs = fastArchs ? FAST_ANDROID_ARCHS : ALL_ANDROID_ARCHS;

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
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'static' },
          android: { buildArchs },
        },
      ],
    ],
  };
};
