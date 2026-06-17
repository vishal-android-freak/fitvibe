import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components';
import { TrainingLoad } from '@/components/genui/TrainingLoad';
import { border, font, fontSize, hue, radius, surface, text, tint } from '@/theme';
import { Eyebrow, Tile } from './parts';

const SESSIONS: { type: string; icon: IconName; dist: string; dur: string; kcal: number; hue: string }[] = [
  { type: 'Outdoor run', icon: 'footprints', dist: '5.2 km', dur: '27:41', kcal: 384, hue: hue.move },
  { type: 'Morning walk', icon: 'footprints', dist: '1.1 km', dur: '14:00', kcal: 78, hue: hue.oxygen },
];

/** Steps/distance/floors, energy & zone minutes, sessions, weekly active minutes. */
export function BodyActivity() {
  return (
    <>
      <Eyebrow>Today</Eyebrow>
      <View style={styles.tripleGrid}>
        <View style={styles.third}><Tile label="Steps" value="8,240" hue={hue.move} icon="footprints" goal="/ 10k" /></View>
        <View style={styles.third}><Tile label="Distance" value="5.2" unit="km" hue={hue.oxygen} icon="map-pin" /></View>
        <View style={styles.third}><Tile label="Floors" value="9" hue={hue.energy} icon="trending-up" /></View>
      </View>
      <View style={[styles.grid, { marginTop: 12 }]}>
        <View style={styles.cell}><Tile label="Active energy" value="612" unit="kcal" hue={hue.energy} icon="flame" goal="/ 750" spark={[410, 520, 480, 612, 560, 470, 612]} /></View>
        <View style={styles.cell}><Tile label="Zone minutes" value="32" unit="min" hue={hue.heart} icon="timer" goal="/ 50" spark={[18, 40, 26, 52, 38, 12, 32]} /></View>
      </View>

      <Eyebrow>Today's sessions</Eyebrow>
      <View style={styles.sessionsCard}>
        {SESSIONS.map((s, i) => (
          <View key={s.type} style={[styles.session, i > 0 && styles.sessionDivider]}>
            <View style={[styles.sessionIcon, { backgroundColor: tint(s.hue, 0.16) }]}>
              <Icon name={s.icon} size={20} color={s.hue} />
            </View>
            <View style={styles.sessionMain}>
              <Text style={styles.sessionType}>{s.type}</Text>
              <Text style={styles.sessionMeta}>{s.dist} · {s.dur} · {s.kcal} kcal</Text>
            </View>
            <Icon name="chevron-right" size={20} color={text.tertiary} />
          </View>
        ))}
      </View>

      <Eyebrow>This week</Eyebrow>
      <TrainingLoad />
    </>
  );
}

const styles = StyleSheet.create({
  tripleGrid: { flexDirection: 'row', gap: 10 },
  third: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  sessionsCard: { borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle, overflow: 'hidden' },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  sessionDivider: { borderTopWidth: 1, borderTopColor: border.subtle },
  sessionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sessionMain: { flex: 1 },
  sessionType: { fontFamily: font.sansBold, fontSize: fontSize.md, color: text.primary },
  sessionMeta: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
});
