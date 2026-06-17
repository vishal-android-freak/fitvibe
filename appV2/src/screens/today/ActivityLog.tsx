import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components';
import { fmtStampClock, useToday, type TimelineEvent } from '@/data/today';
import { accent, border, font, fontSize, hue, mix, radius, surface, text } from '@/theme';

/** Visuals per event category. */
const CATEGORY_META: Record<TimelineEvent['category'], { icon: IconName; hue: string }> = {
  workout: { icon: 'footprints', hue: hue.move },
  wake: { icon: 'sunrise', hue: hue.energy },
  meal: { icon: 'utensils', hue: hue.nutrition },
  water: { icon: 'glass-water', hue: hue.hydration },
};

const KIND_TAG: Record<TimelineEvent['kind'], { label: string; icon: IconName }> = {
  logged: { label: 'Logged', icon: 'pencil' },
  tracked: { label: 'Tracked', icon: 'watch' },
};

/** A unified timeline of today's logged items and tracked activity. */
export function ActivityLog() {
  const { data, loading } = useToday();
  const events = data?.timeline ?? [];

  if (loading && !data) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <ActivityIndicator color={accent.base} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={[styles.card, styles.placeholder]}>
        <Text style={styles.emptyTitle}>Nothing logged yet today</Text>
        <Text style={styles.emptyBody}>Workouts, meals, and water you log will show up here.</Text>
      </View>
    );
  }

  const last = events.length - 1;
  return (
    <View style={styles.card}>
      {events.map((e, i) => {
        const meta = CATEGORY_META[e.category];
        const tag = KIND_TAG[e.kind];
        return (
          <View key={`${e.at}-${e.category}-${e.title}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.railIcon, { backgroundColor: mix(meta.hue, 0.18, surface.card) }]}>
                <Icon name={meta.icon} size={15} color={meta.hue} />
              </View>
            </View>

            <View style={[styles.itemCol, i < last && styles.itemDivider]}>
              <View style={styles.metaRow}>
                <Text style={styles.time}>{fmtStampClock(e)}</Text>
                <View style={styles.kindTag}>
                  <Icon name={tag.icon} size={11} color={text.tertiary} />
                  <Text style={styles.kindTagText}>{tag.label}</Text>
                </View>
              </View>
              <Text style={styles.itemTitle}>{e.title}</Text>
              <Text style={styles.itemDetail}>{e.detail}</Text>
              {e.items && e.items.length > 0 && (
                <Text style={styles.itemContents} numberOfLines={2}>
                  {e.items.join(', ')}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: radius.xl,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  placeholder: { minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 20 },
  emptyTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12, minHeight: 54 },
  rail: { width: 34, alignItems: 'center', paddingTop: 13 },
  railIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  time: { fontFamily: font.mono, fontSize: 10, color: text.tertiary, letterSpacing: -0.2 },
  itemCol: { flex: 1, paddingVertical: 11 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: border.subtle },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  itemDetail: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  itemContents: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.tertiary, marginTop: 3, fontStyle: 'italic' },
  kindTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kindTagText: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary, letterSpacing: 0.3 },
});
