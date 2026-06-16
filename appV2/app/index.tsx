import { useRouter } from 'expo-router';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';

export default function Welcome() {
  const router = useRouter();
  // System Google OAuth gets wired here later. For now, continue into the app.
  return <WelcomeScreen onGoogle={() => router.replace('/(tabs)')} />;
}
