import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components';
import { firstName, useAuth } from '@/auth';
import { ProfileMenu } from './ProfileMenu';
import { font, fontSize, text, tracking } from '@/theme';

function greetingFor(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Time-based greeting + date eyebrow + profile avatar. */
export function TodayHeader() {
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const now = new Date();
  const h = now.getHours();
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.greetingWrap}>
          <Text style={styles.date}>{date.toUpperCase()}</Text>
          <Text style={styles.greeting} numberOfLines={2}>
            {greetingFor(h)}, {firstName(session)}
          </Text>
        </View>
        <Pressable accessibilityLabel="Your profile" onPress={() => setMenuOpen(true)} hitSlop={8}>
          <Avatar name={session?.displayName || ''} src={session?.picture || undefined} size={44} ring />
        </Pressable>
      </View>

      <ProfileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  greetingWrap: { flex: 1, minWidth: 0 },
  date: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: tracking.caps, color: text.tertiary, marginBottom: 5 },
  greeting: { fontFamily: font.display, fontSize: fontSize.xl, letterSpacing: -0.3, color: text.primary, lineHeight: fontSize.xl * 1.15 },
});
