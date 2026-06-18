import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components';
import { accent, border, font, fontSize, surface, text, tint } from '@/theme';
import { type NightView } from './data';

interface DayScrollerProps {
  idx: number;
  setIdx: (i: number) => void;
  nights: NightView[];
}

function Chevron({ dir, disabled, onPress }: { dir: 'left' | 'right'; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={dir === 'left' ? 'Previous night' : 'Next night'}
      style={[styles.chevron, { opacity: disabled ? 0.4 : 1 }]}
    >
      <Icon name={dir === 'left' ? 'chevron-left' : 'chevron-right'} size={20} color={disabled ? text.tertiary : text.primary} />
    </Pressable>
  );
}

/** Title + calendar button, and a ‹ › stepper through the last 7 nights. */
export function DayScroller({ idx, setIdx, nights }: DayScrollerProps) {
  const night = nights[idx];
  const atNewest = idx === 0;
  const atOldest = idx === nights.length - 1;
  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Sleep</Text>
        <Pressable accessibilityLabel="Calendar" style={styles.calBtn}>
          <Icon name="calendar" size={19} color={text.primary} />
        </Pressable>
      </View>
      <View style={styles.scroller}>
        <Chevron dir="left" disabled={atOldest} onPress={() => setIdx(Math.min(nights.length - 1, idx + 1))} />
        <View style={styles.label}>
          <View style={styles.relRow}>
            <Text style={styles.rel}>{night.rel}</Text>
            {night.isNap ? (
              <View style={styles.napBadge}>
                <Text style={styles.napBadgeText}>NAP</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.date}>{night.isNap ? night.date : `${night.day}, ${night.date}`}</Text>
        </View>
        <Chevron dir="right" disabled={atNewest} onPress={() => setIdx(Math.max(0, idx - 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary },
  calBtn: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.card, alignItems: 'center', justifyContent: 'center' },
  scroller: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  chevron: { width: 40, height: 40, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.card, alignItems: 'center', justifyContent: 'center' },
  label: { alignItems: 'center', flex: 1, minWidth: 0 },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rel: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
  napBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: tint(accent.base, 0.18) },
  napBadgeText: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 0.6, color: accent.base },
  date: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
});
