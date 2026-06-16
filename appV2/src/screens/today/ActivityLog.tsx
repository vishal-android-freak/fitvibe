import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Icon, type IconName } from '@/components';
import { AIGradient } from '@/components/ai/AIGradient';
import { accent, ai, border, font, fontSize, glow, hue, mix, radius, surface, text } from '@/theme';

type Entry =
  | { time: string; kind: 'logged' | 'tracked'; icon: IconName; hue: string; title: string; detail: string; badge?: string }
  | { time: string; kind: 'ai'; id: string; title: string; body: string };

const ACTIVITY: Entry[] = [
  { time: '12:05 PM', kind: 'logged', icon: 'brain', hue: hue.mind, title: 'Mindfulness', detail: '10 min · calm session' },
  { time: '10:30 AM', kind: 'logged', icon: 'glass-water', hue: hue.hydration, title: 'Logged water', detail: '+250 ml · 1.6 L today' },
  { time: '9:14 AM', kind: 'tracked', icon: 'route', hue: hue.move, title: 'Morning walk', detail: '1.1 km · 14 min · 78 kcal' },
  {
    time: '7:38 AM',
    kind: 'ai',
    id: 'run',
    title: 'Run analysis',
    body: 'That run sat in zone 2 almost the whole way — ideal aerobic work. Your heart rate drifted up only 4 bpm at a steady pace, a sign your base is improving. Keep tomorrow easy to lock in the gains.',
  },
  { time: '7:02 AM', kind: 'tracked', icon: 'footprints', hue: hue.move, title: 'Outdoor run', detail: '5.2 km · 27:41 · 384 kcal', badge: 'Workout' },
  {
    time: '6:52 AM',
    kind: 'ai',
    id: 'sleep',
    title: 'Sleep analysis',
    body: 'You slept 7h 12m with deep sleep up 18% vs last week. HRV came in at 62 ms — your highest in two weeks — so recovery looks strong. A good day to push.',
  },
  { time: '6:48 AM', kind: 'tracked', icon: 'sunrise', hue: hue.energy, title: 'Woke up', detail: '7h 12m · best sleep this week' },
];

const KIND_TAG: Record<'logged' | 'tracked', { label: string; icon: IconName }> = {
  logged: { label: 'Logged', icon: 'pencil' },
  tracked: { label: 'Tracked', icon: 'watch' },
};

/** A unified timeline feed: logged items, tracked workouts, and inline AI cards. */
export function ActivityLog({ onOpen }: { onOpen?: (id: string) => void }) {
  const last = ACTIVITY.length - 1;
  return (
    <View style={styles.card}>
      {ACTIVITY.map((a, i) => {
        const notLast = i < last;
        return (
          <View key={i} style={styles.row}>
            {/* left rail: just the icon (no connector line) */}
            <View style={styles.rail}>
              {a.kind === 'ai' ? (
                <AIGradient style={[styles.railIcon, glow.ai]}>
                  <Icon name="sparkles" size={15} color={ai.onGradient} />
                </AIGradient>
              ) : (
                <View style={[styles.railIcon, { backgroundColor: mix(a.hue, 0.18, surface.card) }]}>
                  <Icon name={a.icon} size={15} color={a.hue} />
                </View>
              )}
            </View>

            {a.kind === 'ai' ? (
              <View style={styles.aiCol}>
                {/* time beside the icon */}
                <Text style={styles.time}>{a.time}</Text>
                <Pressable onPress={() => onOpen?.(a.id)} style={styles.aiBorder}>
                  <AIGradient style={styles.aiBorderGradient}>
                    <View style={styles.aiInner}>
                      <View style={styles.aiHead}>
                        <Icon name="sparkles" size={12} color={accent.base} />
                        <Text style={styles.aiHeadText}>FitVibe · {a.title}</Text>
                        <Icon name="chevron-right" size={14} color={text.muted} />
                      </View>
                      <Text style={styles.aiBody}>{a.body}</Text>
                      <Text style={styles.aiCta}>View full analysis</Text>
                    </View>
                  </AIGradient>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.itemCol, notLast && styles.itemDivider]}>
                {/* time beside the icon, kind-tag on the right */}
                <View style={styles.metaRow}>
                  <Text style={styles.time}>{a.time}</Text>
                  <View style={styles.kindTag}>
                    <Icon name={KIND_TAG[a.kind].icon} size={11} color={text.tertiary} />
                    <Text style={styles.kindTagText}>{KIND_TAG[a.kind].label}</Text>
                  </View>
                </View>
                {/* then the details below */}
                <View style={styles.itemTitleRow}>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  {a.badge && <Badge hue="move">{a.badge}</Badge>}
                </View>
                <Text style={styles.itemDetail}>{a.detail}</Text>
              </View>
            )}
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
  row: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12, minHeight: 54 },
  rail: { width: 34, alignItems: 'center', paddingTop: 13 },
  railIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  time: { fontFamily: font.mono, fontSize: 10, color: text.tertiary, letterSpacing: -0.2 },
  // item rows — time/tag, then title, then detail (stacked)
  itemCol: { flex: 1, paddingVertical: 11 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: border.subtle },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  itemDetail: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  kindTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kindTagText: { fontFamily: font.sansSemibold, fontSize: 10, color: text.tertiary, letterSpacing: 0.3 },
  // ai cards
  aiCol: { flex: 1, paddingTop: 11, paddingBottom: 12, gap: 6 },
  aiBorder: { borderRadius: radius.md },
  aiBorderGradient: { borderRadius: radius.md, padding: 1 },
  aiInner: { borderRadius: radius.md - 1, padding: 13, backgroundColor: mix(accent.base, 0.1, surface.card) },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiHeadText: { flex: 1, fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.2, color: text.primary, textTransform: 'uppercase' },
  aiBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.5, color: text.secondary, fontWeight: '500' },
  aiCta: { fontFamily: font.sansSemibold, fontSize: fontSize.xs, color: accent.base, marginTop: 8 },
});
