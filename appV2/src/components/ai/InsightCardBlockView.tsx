import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart, Icon, MiniRing, RichText, Sparkline, StreakDots, TypeTag, type IconName } from '@/components';
import { accent, border, font, fontSize, hue as hues, radius, resolveHue, surface, text, tint } from '@/theme';
import type { InsightCardBlock } from '@/data/blocks';

/**
 * Renders an `insight_card` generative block as a full Insights-feed card —
 * type tag + headline + rich body + inline viz + provenance + "Ask about this".
 * Mirrors the look of the (now-retired) mock InsightFeedCard, fed by live data.
 */

const TYPE_META: Record<InsightCardBlock['insightType'], { label: string; icon: IconName }> = {
  trend: { label: 'Trend', icon: 'trending-up' },
  correlation: { label: 'Correlation', icon: 'git-compare-arrows' },
  flag: { label: 'Flag', icon: 'alert-circle' },
  achievement: { label: 'Achievement', icon: 'award' },
  tip: { label: 'Recommendation', icon: 'lightbulb' },
  comparison: { label: 'Comparison', icon: 'chart-no-axes-column' },
};

const CAT_HUE: Record<InsightCardBlock['category'], string> = {
  recovery: accent.base,
  sleep: hues.sleep,
  heart: hues.heart,
  activity: hues.move,
  nutrition: hues.nutrition,
};

function Viz({ viz }: { viz: NonNullable<InsightCardBlock['viz']> }) {
  switch (viz.kind) {
    case 'spark':
      return <Sparkline data={viz.data} hue={resolveHue(viz.hue)} height={50} />;
    case 'bars':
      return <BarChart data={viz.data} labels={viz.labels} hue={resolveHue(viz.hue)} height={76} />;
    case 'streak':
      return <StreakDots filled={viz.filled} total={viz.total} hue={resolveHue(viz.hue)} />;
    case 'ring':
      return <MiniRing value={viz.value} hue={resolveHue(viz.hue)} center={viz.center} />;
    default:
      return null;
  }
}

export function InsightCardBlockView({ block }: { block: InsightCardBlock }) {
  const router = useRouter();
  const t = TYPE_META[block.insightType] ?? TYPE_META.trend;
  const catHue = CAT_HUE[block.category] ?? accent.base;
  const seed = block.seed ?? block.headline;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/ask', params: { seed } })}
    >
      <View style={styles.head}>
        <TypeTag icon={t.icon} label={t.label} color={catHue} />
      </View>

      <Text style={styles.headline}>{block.headline}</Text>
      <RichText segs={block.body} style={styles.body} />

      {block.viz && (
        <View style={styles.viz}>
          <Viz viz={block.viz} />
        </View>
      )}

      {block.provenance && block.provenance.length > 0 && (
        <View style={styles.prov}>
          <Text style={styles.derived}>DERIVED FROM</Text>
          {block.provenance.map((m, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: tint(resolveHue(m.hue), 0.14) }]}>
              <Icon name={m.icon as IconName} size={11} color={resolveHue(m.hue)} />
              <Text style={[styles.chipLabel, { color: resolveHue(m.hue) }]}>{m.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Icon name="sparkles" size={14} color={accent.base} />
        <Text style={styles.askText}>Ask about this</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  headline: { fontFamily: font.display, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.25, letterSpacing: -0.3, color: text.primary, marginBottom: 8 },
  body: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.5, color: text.secondary },
  viz: { marginTop: 12 },
  prov: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border.subtle },
  derived: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1, color: text.tertiary, marginRight: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  chipLabel: { fontFamily: font.sansSemibold, fontSize: fontSize['2xs'] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  askText: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: accent.base },
});
