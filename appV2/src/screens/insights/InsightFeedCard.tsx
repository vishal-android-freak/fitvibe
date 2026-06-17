import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components';
import { accent, border, font, fontSize, radius, surface, text, tint } from '@/theme';
import { CAT_HUE, TYPE_META, type Insight } from './data';
import { Viz } from './Viz';
import { Provenance } from './Provenance';

function TypeTag({ insight }: { insight: Insight }) {
  const c = CAT_HUE[insight.cat];
  const t = TYPE_META[insight.type];
  return (
    <View style={[styles.tag, { backgroundColor: tint(c, 0.15) }]}>
      <Icon name={t.icon} size={12} color={c} />
      <Text style={[styles.tagLabel, { color: c }]}>{t.label}</Text>
    </View>
  );
}

function Feedback() {
  const [v, setV] = useState<'up' | 'down' | null>(null);
  const btn = (val: 'up' | 'down', icon: 'thumbs-up' | 'thumbs-down') => {
    const on = v === val;
    return (
      <Pressable
        onPress={() => setV(on ? null : val)}
        accessibilityLabel={val}
        style={[styles.fbBtn, on && { backgroundColor: accent.soft }]}
      >
        <Icon name={icon} size={15} color={on ? accent.base : text.tertiary} />
      </Pressable>
    );
  };
  return (
    <View style={styles.feedback}>
      {btn('up', 'thumbs-up')}
      {btn('down', 'thumbs-down')}
    </View>
  );
}

/** A single derived-insight feed card; tapping it opens Ask FitVibe seeded. */
export function InsightFeedCard({ insight, onAsk }: { insight: Insight; onAsk: (seed: string) => void }) {
  return (
    <Pressable onPress={() => onAsk(insight.seed)} style={styles.card}>
      <View style={styles.head}>
        <TypeTag insight={insight} />
        {insight.isNew && <Text style={styles.new}>NEW</Text>}
        <Text style={styles.time}>{insight.time}</Text>
      </View>

      <Text style={styles.headline}>{insight.headline}</Text>
      <Text style={styles.body}>
        {insight.body.map((s, i) => (
          <Text key={i} style={s.b ? styles.bodyBold : undefined}>
            {s.t}
          </Text>
        ))}
      </Text>

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
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagLabel: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.3 },
  new: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.5, color: accent.base },
  time: { marginLeft: 'auto', fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
  headline: { fontFamily: font.display, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.25, letterSpacing: -0.3, color: text.primary, marginBottom: 8 },
  body: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.5, color: text.secondary },
  bodyBold: { fontFamily: font.sansBold, color: text.primary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  askText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: accent.base },
  feedback: { flexDirection: 'row', gap: 2 },
  fbBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
