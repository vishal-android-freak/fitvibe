import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, Screen } from '@/components';
import { accent, font, fontSize, text } from '@/theme';
import { useBody } from '@/data/body';
import { Segmented, type BodySeg } from './Segmented';
import { BodyVitals } from './BodyVitals';
import { BodyNutrition } from './BodyNutrition';
import { BodyActivity } from './BodyActivity';

/**
 * The Body dashboard — segmented Vitals/Activity/Nutrition off real /me/body
 * data. The data hook lives in <BodyBody> (inside <Screen>) so it registers
 * with the screen's RefreshScope for pull-to-refresh. Logging is handled by the
 * LLM layer, not an in-app form.
 */
export function BodyScreen() {
  return (
    <ScreenContainer>
      <Screen>
        <BodyBody />
      </Screen>
    </ScreenContainer>
  );
}

function BodyBody() {
  const [seg, setSeg] = useState<BodySeg>('vitals');
  const { data, loading, error } = useBody();

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Body</Text>
        <Segmented value={seg} onChange={setSeg} />
      </View>
      <View style={styles.section}>
        {!data ? (
          <View style={styles.placeholder}>
            {loading ? (
              <ActivityIndicator color={accent.base} />
            ) : (
              <Text style={styles.emptyBody}>{error ? "Couldn't load your body data" : 'No data yet'}</Text>
            )}
          </View>
        ) : (
          <>
            {seg === 'vitals' && <BodyVitals vitals={data.vitals} body={data.body} />}
            {seg === 'activity' && <BodyActivity activity={data.activity} />}
            {seg === 'nutrition' && <BodyNutrition nutrition={data.nutrition} />}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  section: { marginTop: 4 },
  placeholder: { minHeight: 200, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, textAlign: 'center' },
});
