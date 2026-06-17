import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { border, font, fontSize, radius, surface, text, tint } from '@/theme';

export interface Session {
  type: string;
  icon: IconName;
  hue: string;
  /** middle metadata line, e.g. "5.2 km · 27:41 · 384 kcal" */
  meta: string;
}

/** A card listing activity sessions (icon, title, metadata). Generative-UI block. */
export function SessionList({ sessions, style }: { sessions: Session[]; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {sessions.map((s, i) => (
        <View key={s.type + i} style={[styles.row, i > 0 && styles.divider]}>
          <View style={[styles.icon, { backgroundColor: tint(s.hue, 0.16) }]}>
            <Icon name={s.icon} size={20} color={s.hue} />
          </View>
          <View style={styles.main}>
            <Text style={styles.type}>{s.type}</Text>
            <Text style={styles.meta}>{s.meta}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={text.tertiary} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: border.subtle },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1 },
  type: { fontFamily: font.sansBold, fontSize: fontSize.md, color: text.primary },
  meta: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
});
