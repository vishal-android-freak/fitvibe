import { Redirect } from 'expo-router';
import { useAuth } from '@/auth';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';

/**
 * Entry gate: returning signed-in users go straight to Today; everyone else
 * sees the onboarding welcome. While the persisted session is loading we render
 * nothing (the splash screen is still up).
 */
export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') return null;
  if (status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <WelcomeScreen />;
}
