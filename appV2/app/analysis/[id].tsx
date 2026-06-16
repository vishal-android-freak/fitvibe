import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FieldGlow, Icon } from '@/components';
import { font, fontSize, text } from '@/theme';

export default function AnalysisModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <FieldGlow>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.close} onPress={() => router.back()} accessibilityLabel="Close">
          <Icon name="x" size={24} color={text.secondary} />
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.title}>Analysis</Text>
          <Text style={styles.sub}>{id} — rich AI analysis coming next.</Text>
        </View>
      </SafeAreaView>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  close: { alignSelf: 'flex-end', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary },
  sub: { fontFamily: font.sansRegular, fontSize: fontSize.base, color: text.tertiary },
});
