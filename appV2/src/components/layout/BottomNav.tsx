import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIGradient } from '@/components/ai/AIGradient';
import { AnimatedPressable, usePressScale } from '@/components/core/AnimatedPressable';
import { Icon, type IconName } from '@/components/Icon';
import { accent, glass, glow, radius, text as textColor } from '@/theme';

export interface NavItem {
  key: string;
  icon: IconName;
  label: string;
  /** the center AI button */
  ai?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'index', icon: 'house', label: 'Today' },
  { key: 'sleep', icon: 'moon', label: 'Sleep' },
  { key: 'ask', icon: 'sparkles', label: 'Ask', ai: true },
  { key: 'body', icon: 'activity', label: 'Body' },
  { key: 'insights', icon: 'lightbulb', label: 'Insights' },
];

export interface BottomNavProps {
  active: string;
  onSelect: (key: string) => void;
}

/** Floating glass bottom nav with the center AI "Ask" button. */
export function BottomNav({ active, onSelect }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(14, insets.bottom) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Clipped glass/border background — kept separate so the raised AI
            button can overflow the bar's top edge without being clipped. */}
        <BlurView intensity={Platform.OS === 'android' ? 0 : 40} tint="dark" style={styles.glass} />
        <View style={styles.row}>
          {NAV_ITEMS.map((item) =>
            item.ai ? (
              <AskButton key={item.key} item={item} onSelect={onSelect} />
            ) : (
              <NavTab key={item.key} item={item} active={active === item.key} onSelect={onSelect} />
            ),
          )}
        </View>
      </View>
    </View>
  );
}

function NavTab({ item, active, onSelect }: { item: NavItem; active: boolean; onSelect: (k: string) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onSelect(item.key)} style={styles.tab}>
      <Icon name={item.icon} size={22} strokeWidth={active ? 2.4 : 2} color={active ? accent.base : textColor.tertiary} />
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, { color: active ? accent.base : textColor.tertiary }]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function AskButton({ item, onSelect }: { item: NavItem; onSelect: (k: string) => void }) {
  const press = usePressScale(0.92);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => onSelect(item.key)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.askWrap, press.animStyle]}
    >
      <AIGradient style={[styles.ask, glow.ai]}>
        <Icon name={item.icon} size={24} strokeWidth={2.4} color="#05131F" />
      </AIGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, alignItems: 'center' },
  bar: {
    // Full width on phones (capped on big screens) so the equal-width slots
    // distribute with airy, even spacing — matching the original layout.
    width: '100%',
    maxWidth: 420,
    height: 72,
    justifyContent: 'center',
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: glass.border,
    backgroundColor: glass.bar,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  // Fixed-width slots: equal so labels/weights can't reflow neighbors;
  // space-between spreads them evenly across the bar (airy, like the original).
  tab: { width: 56, alignItems: 'center', gap: 3, paddingVertical: 8 },
  tabLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 10, letterSpacing: 0.2 },
  askWrap: { width: 56, marginTop: -22, alignItems: 'center', justifyContent: 'center' },
  ask: { width: 54, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
