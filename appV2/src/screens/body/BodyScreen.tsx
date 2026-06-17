import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer, Screen, Toast } from '@/components';
import { font, fontSize, text } from '@/theme';
import { Segmented, type BodySeg } from './Segmented';
import { BodyVitals } from './BodyVitals';
import { BodyNutrition } from './BodyNutrition';
import { BodyActivity } from './BodyActivity';
import { LogFab } from './log/LogFab';
import { LogMenu } from './log/LogMenu';
import { LogSheet } from './log/LogSheet';
import type { LogKind } from './log/types';

/**
 * The Body dashboard — segmented Vitals/Nutrition/Activity, plus the floating
 * log FAB → menu → per-kind sheet → confirmation toast. Composes independent
 * sections; the log machinery lives in ./log.
 */
export function BodyScreen() {
  const insets = useSafeAreaInsets();
  const [seg, setSeg] = useState<BodySeg>('vitals');
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
          <View style={styles.header}>
            <Text style={styles.title}>Body</Text>
            <Segmented value={seg} onChange={setSeg} />
          </View>
          <View style={styles.section}>
            {seg === 'vitals' && <BodyVitals />}
            {seg === 'nutrition' && <BodyNutrition />}
            {seg === 'activity' && <BodyActivity />}
          </View>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  header: { paddingTop: 12 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  section: { marginTop: 4 },
});
