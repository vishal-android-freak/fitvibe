import { Stack, useRouter } from 'expo-router';
import { ConversationHistory } from '@/screens/ask/ConversationHistory';

export default function HistoryScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ConversationHistory
        onClose={() => router.back()}
        onPick={(id) => router.replace({ pathname: '/ask', params: { conversationId: id } })}
      />
    </>
  );
}
