import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feedback, Icon, RichText, TypeTag } from '@/components';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';
import { CAT_HUE, TYPE_META, type Insight } from './data';
import { Viz } from './Viz';
import { Provenance } from './Provenance';

/** A single derived-insight feed card; tapping it opens Ask FitVibe seeded. */
export function InsightFeedCard({ insight, onAsk }: { insight: Insight; onAsk: (seed: string) => void }) {
  const t = TYPE_META[insight.type];
  return (
    <Pressable onPress={() => onAsk(insight.seed)} style={styles.card}>
      <View style={styles.head}>
        <TypeTag icon={t.icon} label={t.label} color={CAT_HUE[insight.cat]} />
        {insight.isNew && <Text style={styles.new}>NEW</Text>}
        <Text style={styles.time}>{insight.time}</Text>
      </View>

      <Text style={styles.headline}>{insight.headline}</Text>
      <RichText segs={insight.body} style={styles.body} />

      <Viz viz={insight.viz} />
      <Provenance items={insight.prov} />

      <View style={styles.footer}>
        <View style={styles.ask}>
          <Icon name="sparkles" size={14} color={accent.base} />
          <Text style={styles.askText}>Ask about this</Text>
        </View>
        <Feedback />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  new: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.5, color: accent.base },
  time: { marginLeft: 'auto', fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
  headline: { fontFamily: font.display, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.25, letterSpacing: -0.3, color: text.primary, marginBottom: 8 },
  body: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.5, color: text.secondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  askText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: accent.base },
});
