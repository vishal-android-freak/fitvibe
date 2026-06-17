import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components';
import { border, font, fontSize, surface, text } from '@/theme';
import type { ProvItem } from './data';

/** "Derived from {data points}" chips + optional source/freshness line.
 *  Core to Insights — every card traces back to its Google Health data points. */
export function Provenance({ items, source, topBorder = border.subtle }: { items: ProvItem[]; source?: string; topBorder?: string }) {
  return (
    <View style={[styles.root, { borderTopColor: topBorder }]}>
      <View style={styles.chips}>
        <Text style={styles.derived}>DERIVED FROM</Text>
        {items.map((m) => (
          <View key={m.label} style={styles.chip}>
            <Icon name={m.icon} size={12} color={m.hue} />
            <Text style={styles.chipLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
      {source ? (
        <View style={styles.sourceRow}>
          <Icon name="watch" size={12} color={text.tertiary} />
          <Text style={styles.source}>{source}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 14, paddingTop: 13, borderTopWidth: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  derived: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary, marginRight: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 7, paddingRight: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle },
  chipLabel: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'], color: text.secondary },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  source: { fontFamily: font.sansRegular, fontSize: fontSize['2xs'], color: text.tertiary },
});
