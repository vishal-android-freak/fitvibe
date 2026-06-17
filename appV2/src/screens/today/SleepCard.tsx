import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Badge, Hypnogram, type TypicalByStage } from '@/components';
import { useToday } from '@/data/today';
import { fmtClock, fmtMin } from '@/data/mock';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';

/** Last night's sleep: a summary header over the shared Hypnogram component,
 *  driven by the user's most recent recorded night (from the Today aggregate). */
export function SleepCard() {
  const today = useToday();
  const data = today.data?.sleep ?? null;
  const { loading, error } = today;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.placeholder}>
        <ActivityIndicator color={accent.base} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Couldn't load last night's sleep.</Text>
      </View>
    );
  } else if (!data) {
    body = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>No sleep recorded yet</Text>
        <Text style={styles.placeholderText}>Wear your device to bed and it'll show up here.</Text>
      </View>
    );
  } else {
    // Age-banded typical fractions from the backend drive the breakdown markers.
    const typical: TypicalByStage = {
      Deep: data.typical.deep,
      REM: data.typical.rem,
      Light: data.typical.light,
      Awake: data.typical.awake,
    };
    body = (
      <>
        <View style={styles.header}>
          <View>
            <View style={styles.headRow}>
              <Text style={styles.duration}>{fmtMin(data.asleepMinutes)}</Text>
              <Text style={styles.asleep}>asleep</Text>
            </View>
            <Text style={styles.times}>
              {fmtClock(data.onsetClock)} – {fmtClock(data.wakeClock)} · {data.efficiency}% efficiency
            </Text>
            {data.awakenings > 0 && (
              <Text style={styles.times}>
                {data.awakenings} {data.awakenings === 1 ? 'awakening' : 'awakenings'}
              </Text>
            )}
          </View>
        </View>

        <Hypnogram style={styles.chart} segments={data.segments} onsetClock={data.onsetClock} typical={typical} />
      </>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  duration: { fontFamily: font.display, fontSize: fontSize.lg, color: text.primary },
  asleep: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  times: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 5 },
  chart: { marginTop: 6 },
  placeholder: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  placeholderTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  placeholderText: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, textAlign: 'center' },
});
