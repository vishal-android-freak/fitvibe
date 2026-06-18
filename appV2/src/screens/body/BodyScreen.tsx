import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Screen, Toast } from '@/components';
import { accent, font, fontSize, text } from '@/theme';
import { useBody } from '@/data/body';
import { Segmented, type BodySeg } from './Segmented';
import { BodyVitals } from './BodyVitals';
import { BodyNutrition } from './BodyNutrition';
import { BodyActivity } from './BodyActivity';
import { LogFab } from './log/LogFab';
import { LogMenu } from './log/LogMenu';
import { LogSheet } from './log/LogSheet';
import type { LogKind } from './log/types';

/**
 * The Body dashboard — segmented Vitals/Activity/Nutrition off real /me/body
 * data, plus the floating log FAB → menu → per-kind sheet → toast. The data
 * hook lives in <BodyBody> (inside <Screen>) so it registers with the screen's
 * RefreshScope for pull-to-refresh.
 */
export function BodyScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<LogKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pick = (id: LogKind) => {
    setMenuOpen(false);
    setTimeout(() => setSheet(id), 180);
  };
  const confirm = (msg: string) => {
    setSheet(null);
    setToast(msg);
  };

  const fabBottom = Math.max(14, insets.bottom) + 86; // above the floating nav

  return (
    <View style={styles.root}>
      <ScreenContainer>
        <Screen>
          <BodyBody />
        </Screen>
      </ScreenContainer>

      {/* Overlays anchored to a full-screen layer, above the content + nav. */}
      <View style={styles.overlay} pointerEvents="box-none">
        <LogMenu open={menuOpen} onClose={() => setMenuOpen(false)} onPick={pick} bottom={fabBottom + 72} />
        <LogFab open={menuOpen} onPress={() => setMenuOpen((m) => !m)} bottom={fabBottom} />
        <LogSheet kind={sheet} onClose={() => setSheet(null)} onConfirm={confirm} />
        {toast && <Toast message={toast} onClose={() => setToast(null)} bottom={fabBottom + 12} />}
      </View>
    </View>
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
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  header: { paddingTop: 12 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  section: { marginTop: 4 },
  placeholder: { minHeight: 200, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, textAlign: 'center' },
});
