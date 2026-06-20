import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  Badge,
  BarChart,
  Hypnogram,
  InsightCard,
  MicroBars,
  MiniRing,
  ReadinessCard,
  RecoverySignals,
  RichText,
  Sparkline,
  StatTile,
  StatTileGrid,
  StreakDots,
} from '@/components';
import { CanvasBlock } from './CanvasBlock';
import { font, fontSize, layout, space, text as textTok } from '@/theme';
import type { BadgeSpec, GenerativeBlock } from '@/data/blocks';

/**
 * Renders a Vaidya generative-UI block. Composite "insight" blocks wrap the
 * AI InsightCard; primitive blocks map 1:1 to the data components; `canvas`
 * draws with Skia. Unknown kinds render nothing (forward-compatible).
 */

function badges(list: BadgeSpec[] | undefined) {
  if (!list?.length) return null;
  return (
    <View style={styles.badgeRow}>
      {list.map((b, i) => (
        <Badge key={i} hue={b.hue} tone={b.tone}>
          {b.text}
        </Badge>
      ))}
    </View>
  );
}

export function BlockRenderer({ block }: { block: GenerativeBlock }) {
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, layout.maxContent) - layout.gutter * 2;

  switch (block.kind) {
    // --- Tier 1: composite insight cards ---
    case 'today_headline':
      return (
        <InsightCard title={block.title} footer={badges(block.badges)}>
          <Text style={styles.body}>{block.body}</Text>
        </InsightCard>
      );
    case 'sleep_insight':
      return (
        <InsightCard title={block.title} footer={badges(block.badges)}>
          <RichText segs={block.body} />
        </InsightCard>
      );
    case 'day_summary':
      return (
        <InsightCard title={block.headline}>
          <RichText segs={block.body} />
        </InsightCard>
      );

    // --- Tier 2: primitive evidence blocks ---
    case 'hypnogram':
      return <Hypnogram segments={block.segments} onsetClock={block.onsetClock} showBreakdown={block.showBreakdown} />;
    case 'sparkline':
      return <Sparkline data={block.data} hue={block.hue} fill={block.fill} dot={block.dot} />;
    case 'bars':
      return <BarChart data={block.data} labels={block.labels} hue={block.hue} goal={block.goal} tooltips={block.tooltips} />;
    case 'ring':
      return <MiniRing value={block.value} hue={block.hue} center={block.center} />;
    case 'stat_tile': {
      const { kind, ...spec } = block;
      return <StatTile {...spec} />;
    }
    case 'stat_tile_grid':
      return <StatTileGrid tiles={block.tiles} columns={block.columns} />;
    case 'readiness_card':
      return <ReadinessCard score={block.score} caption={block.caption} hue={block.hue} factors={block.factors} />;
    case 'recovery_signals':
      return <RecoverySignals signals={block.signals} labels={block.labels} />;
    case 'streak_dots':
      return <StreakDots filled={block.filled} total={block.total} hue={block.hue} />;
    case 'micro_bars':
      return <MicroBars items={block.items} />;
    case 'badge':
      return (
        <View style={styles.badgeRow}>
          <Badge hue={block.hue} tone={block.tone}>
            {block.text}
          </Badge>
        </View>
      );

    // --- escape hatch ---
    case 'canvas':
      return <CanvasBlock block={block} maxWidth={maxW} />;

    default:
      return null;
  }
}

/** Render an ordered list of blocks with consistent vertical spacing. */
export function BlockList({ blocks }: { blocks: GenerativeBlock[] }) {
  return (
    <View style={styles.list}>
      {blocks.map((b, i) => (
        <BlockRenderer key={i} block={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
  body: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: 20, color: textTok.secondary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
});
