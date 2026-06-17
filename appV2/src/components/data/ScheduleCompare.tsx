import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { border, font, fontSize, radius, status, surface, text, tint } from '@/theme';

export interface ScheduleItem {
  icon: IconName;
  hue: string;
  label: string;
  /** actual value, e.g. "11:24 PM" */
  actual: string;
  /** target value, e.g. "11:00 PM" */
  target: string;
  /** delta string, e.g. "+24m" / "−6m"; on-target ("+0m"/"0m") renders positive */
  delta: string;
}

/** Actual-vs-target schedule rows (e.g. bedtime & wake) with deltas. Generative-UI block. */
export function ScheduleCompare({ items, style }: { items: ScheduleItem[]; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {items.map((it, i) => {
        const off = it.delta !== '' && it.delta !== 'on time';
        return (
          <React.Fragment key={it.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: tint(it.hue, 0.16) }]}>
                <Icon name={it.icon} size={18} color={it.hue} />
              </View>
              <View style={styles.mid}>
                <Text style={styles.label}>{it.label}</Text>
                <Text style={styles.target}>target {it.target}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.actual}>{it.actual}</Text>
                {it.delta !== '' && (
                  <Text style={[styles.delta, { color: off ? status.warning : status.positive }]}>{it.delta}</Text>
                )}
              </View>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.primary },
  target: { fontFamily: font.mono, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  actual: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  delta: { fontFamily: font.sansBold, fontSize: fontSize.xs, marginTop: 1 },
  divider: { height: 1, backgroundColor: border.subtle },
});
