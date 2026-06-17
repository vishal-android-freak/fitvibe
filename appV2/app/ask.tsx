import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { AskConversation } from '@/screens/ask/AskConversation';

export default function AskModal() {
  const router = useRouter();
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AskConversation seed={seed} onClose={() => router.back()} />
    </>
  );
}
