import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Icon } from '@/components';
import { AIGradient } from '@/components/ai/AIGradient';
import { firstName, useAuth } from '@/auth';
import { accent, ai, font, fontSize, mix, radius, surface, text, tint, tracking } from '@/theme';

function greetingFor(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function aiLineFor(h: number): string {
  if (h < 11) return 'You woke well-recovered — 82% of your move goal is still ahead of you.';
  if (h < 15) return "You're 82% to your move goal with the afternoon still ahead. Nicely paced.";
  if (h < 20) return 'Strong day — one short walk closes your move ring.';
  return "You've hit your rings. Wind down soon to protect that HRV streak.";
}

/** Time-based greeting + date eyebrow + profile avatar, with an AI one-liner strip. */
export function TodayHeader() {
  const { session } = useAuth();
  const now = new Date();
  const h = now.getHours();
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.greetingWrap}>
          <Text style={styles.date}>{date.toUpperCase()}</Text>
          <Text style={styles.greeting} numberOfLines={1}>
            {greetingFor(h)}, {firstName(session)}
          </Text>
        </View>
        <Pressable accessibilityLabel="Your profile">
          <Avatar name={session?.displayName || ''} src={session?.picture || undefined} size={44} ring />
        </Pressable>
      </View>

      <View style={styles.aiStrip}>
        <AIGradient style={styles.aiStripIcon}>
          <Icon name="sparkles" size={13} color={ai.onGradient} />
        </AIGradient>
        <Text style={styles.aiStripText}>{aiLineFor(h)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  greetingWrap: { flex: 1, minWidth: 0 },
  date: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: tracking.caps, color: text.tertiary, marginBottom: 5 },
  greeting: { fontFamily: font.display, fontSize: fontSize['2xl'], letterSpacing: -0.4, color: text.primary, lineHeight: fontSize['2xl'] * 1.1 },
  aiStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    backgroundColor: mix(accent.base, 0.1, surface.bgApp),
    borderWidth: 1,
    borderColor: tint(accent.base, 0.25),
  },
  aiStripIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1, overflow: 'hidden' },
  aiStripText: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.45, color: text.secondary },
});
