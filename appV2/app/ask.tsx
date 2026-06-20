import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { AskConversation } from '@/screens/ask/AskConversation';

export default function AskScreen() {
  const router = useRouter();
  const { seed, conversationId } = useLocalSearchParams<{ seed?: string; conversationId?: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AskConversation
        seed={seed}
        conversationId={conversationId}
        onClose={() => router.back()}
        onHistory={() => router.push('/history')}
      />
    </>
  );
}
