import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AIGradient, Icon, type IconName } from '@/components';
import { ai, border, font, fontSize, hue, radius, surface, text } from '@/theme';

const STATS: { icon: IconName; hue: string; value: string; label: string }[] = [
  { icon: 'moon', hue: hue.sleep, value: '7h 02m', label: 'avg sleep' },
  { icon: 'heart', hue: hue.heart, value: '49', label: 'avg resting HR' },
  { icon: 'flame', hue: hue.move, value: '6/7', label: 'move goals' },
  { icon: 'battery-charging', hue: '#A78BFA', value: '81', label: 'avg readiness' },
];

/** "Your week in review" — four headline stats. */
export function WeeklyRecap() {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AIGradient style={styles.headIcon}>
          <Icon name="calendar-check" size={14} color={ai.onGradient} />
        </AIGradient>
        <Text style={styles.title}>Your week in review</Text>
        <Text style={styles.range}>Jun 9–15</Text>
      </View>
      <View style={styles.grid}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Icon name={s.icon} size={16} color={s.hue} />
            <Text style={styles.value}>{s.value}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  headIcon: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  range: { marginLeft: 'auto', fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary, marginTop: 5, lineHeight: fontSize.md },
  label: { fontFamily: font.sansSemibold, fontSize: 9.5, lineHeight: 12, color: text.tertiary, marginTop: 3, textAlign: 'center' },
});
