import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FieldGlow, Icon, Rise } from '@/components';
import { AppIcon } from '@/components/brand/AppIcon';
import { GoogleButton } from '@/components/brand/GoogleButton';
import { useAuth } from '@/auth';
import { font, fontSize, glow, radius, status, text } from '@/theme';
import { useResponsive } from '@/theme';

/**
 * Onboarding welcome ("calm" variant): app icon, headline, subcopy, the white
 * "Continue with Google" button, a privacy note, and legal microcopy. The
 * button runs the real Google OAuth flow via the auth context.
 */
export function WelcomeScreen() {
  const { maxContent } = useResponsive();
  const { signIn, busy, error } = useAuth();

  return (
    <FieldGlow>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.column, { maxWidth: maxContent }]}>
          <View style={styles.hero}>
            <Rise delay={40}>
              <View style={styles.iconWrap}>
                <AppIcon size={96} />
              </View>
            </Rise>
            <Rise delay={120}>
              <Text style={styles.title}>Your data, finally{'\n'}making sense.</Text>
            </Rise>
            <Rise delay={200}>
              <Text style={styles.subtitle}>
                FitVibe brings your Fitbit and Google Health data to life — with insights you can actually
                understand, and an AI you can ask anything.
              </Text>
            </Rise>
          </View>

          <Rise delay={300} style={styles.footer}>
            <GoogleButton onPress={() => void signIn()} busy={busy} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.privacy}>
              <Icon name="shield-check" size={14} color={text.muted} />
              <Text style={styles.privacyText}>Your data stays private, synced to your own device.</Text>
            </View>
            <Text style={styles.legal}>
              By continuing you agree to FitVibe's <Text style={styles.legalStrong}>terms</Text> and{' '}
              <Text style={styles.legalStrong}>privacy policy</Text>.
            </Text>
          </Rise>
        </View>
      </SafeAreaView>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  iconWrap: { borderRadius: radius.xl, marginBottom: 28, ...glow.ai },
  title: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 34 * 1.12,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: text.primary,
    marginBottom: 14,
    alignSelf: 'stretch',
  },
  subtitle: {
    fontFamily: font.sansRegular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.65,
    textAlign: 'center',
    color: text.secondary,
    maxWidth: 308,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  error: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: status.danger, textAlign: 'center', marginTop: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 },
  privacyText: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, textAlign: 'center' },
  legal: {
    fontFamily: font.sansRegular,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.55,
    textAlign: 'center',
    color: text.tertiary,
    marginTop: 12,
    marginHorizontal: 18,
  },
  legalStrong: { color: text.secondary, fontFamily: font.sansSemibold },
});
