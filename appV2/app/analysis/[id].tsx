import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { AIAnalysisDetail } from '@/screens/analysis/AIAnalysisDetail';
import type { AnalysisId } from '@/screens/analysis/data';

export default function AnalysisModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const analysisId: AnalysisId = id === 'run' ? 'run' : 'sleep';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AIAnalysisDetail
        id={analysisId}
        onClose={() => router.back()}
        onContinue={(seed) => router.replace(seed ? { pathname: '/ask', params: { seed } } : '/ask')}
      />
    </>
  );
}
