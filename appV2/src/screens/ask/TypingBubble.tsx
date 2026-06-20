import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AIGradient, Icon } from '@/components';
import { ai, border, surface, text } from '@/theme';

function Dot({ delay, reduced }: { delay: number; reduced: boolean }) {
  const o = useSharedValue(0.35);
  useEffect(() => {
    if (reduced) return;
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }), withTiming(0.35, { duration: 350, easing: Easing.inOut(Easing.ease) })), -1, false));
    return () => cancelAnimation(o);
  }, [delay, reduced, o]);
  const style = useAnimatedStyle(() => ({ opacity: reduced ? 0.6 : o.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Assistant "typing…" indicator — sparkle avatar + three pulsing dots. */
export function TypingBubble() {
  const reduced = useReducedMotion();
  return (
    <View style={styles.row}>
      <AIGradient style={styles.avatar}>
        <Icon name="heart-pulse" size={11} color={ai.onGradient} />
      </AIGradient>
      <View style={styles.bubble}>
        <Dot delay={0} reduced={reduced} />
        <Dot delay={150} reduced={reduced} />
        <Dot delay={300} reduced={reduced} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  avatar: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bubble: { flexDirection: 'row', gap: 4, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.subtle },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: text.muted },
});
