import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, EcgTrace, Icon, StatTileGrid, type StatTileSpec } from '@/components';
import { border, font, fontSize, hue, radius, surface, text } from '@/theme';
import { Eyebrow } from './parts';

const HEART: StatTileSpec[] = [
  { label: 'Resting HR', value: '54', unit: 'bpm', hue: hue.heart, icon: 'heart', delta: '3 bpm', deltaDir: 'down', spark: [58, 57, 57, 56, 55, 54, 54] },
  { label: 'HRV', value: '62', unit: 'ms', hue: hue.mind, icon: 'activity', delta: '12%', deltaDir: 'up', spark: [52, 55, 54, 58, 60, 61, 62] },
  { label: 'Blood pressure', value: '118/76', unit: 'mmHg', hue: hue.heart, icon: 'gauge', spark: [120, 119, 121, 118, 117, 119, 118] },
  { label: 'VO₂ max', value: '44', unit: 'ml/kg', hue: hue.move, icon: 'gauge', delta: '1', deltaDir: 'up', spark: [42, 42, 43, 43, 43, 44, 44] },
];

const OXYGEN: StatTileSpec[] = [
  { label: 'SpO₂', value: '97', unit: '%', hue: hue.oxygen, icon: 'wind', spark: [96, 97, 96, 97, 98, 97, 97] },
  { label: 'Respiratory rate', value: '14.2', unit: 'br/min', hue: hue.sky, icon: 'wind', spark: [14.5, 14.2, 14.4, 14.1, 14.0, 14.3, 14.2] },
];

const BODY: StatTileSpec[] = [
  { label: 'Weight', value: '68.4', unit: 'kg', hue: hue.sky, icon: 'scale', delta: '0.7 kg', deltaDir: 'down', spark: [69.1, 69.0, 68.8, 68.7, 68.6, 68.5, 68.4] },
  { label: 'Body fat', value: '22.1', unit: '%', hue: hue.nutrition, icon: 'user', delta: '0.4%', deltaDir: 'down', spark: [23.0, 22.8, 22.6, 22.5, 22.3, 22.2, 22.1] },
  { label: 'Body temp', value: '36.6', unit: '°C', hue: hue.energy, icon: 'thermometer', spark: [36.5, 36.6, 36.7, 36.6, 36.5, 36.6, 36.6] },
  { label: 'Blood glucose', value: '5.4', unit: 'mmol/L', hue: hue.mind, icon: 'droplet', spark: [5.6, 5.5, 5.7, 5.4, 5.3, 5.5, 5.4] },
];

/** Full vitals catalog: heart & circulation (+ ECG), oxygen, body composition. */
export function BodyVitals() {
  return (
    <>
      <Eyebrow>Heart &amp; circulation</Eyebrow>
      <StatTileGrid tiles={HEART} />

      <View style={styles.ecg}>
        <View style={styles.ecgHead}>
          <Icon name="heart-pulse" size={18} color={hue.heart} />
          <Text style={styles.ecgTitle}>ECG · heart rhythm</Text>
          <Badge tone="positive">Normal sinus</Badge>
        </View>
        <EcgTrace color={hue.heart} />
        <Text style={styles.ecgSub}>Last reading 2 days ago · 62 bpm average</Text>
      </View>

      <Eyebrow>Oxygen &amp; respiration</Eyebrow>
      <StatTileGrid tiles={OXYGEN} />

      <Eyebrow>Body</Eyebrow>
      <StatTileGrid tiles={BODY} />

      <View style={styles.disclaimer}>
        <Icon name="info" size={14} color={text.tertiary} />
        <Text style={styles.disclaimerText}>
          ECG, blood pressure and glucose readings are for wellness tracking only and are not medical advice.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ecg: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  ecgHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ecgTitle: { flex: 1, fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  ecgSub: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 8 },
  disclaimer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14 },
  disclaimerText: { flex: 1, fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.5, color: text.tertiary },
});
