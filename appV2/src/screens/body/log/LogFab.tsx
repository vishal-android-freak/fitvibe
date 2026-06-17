import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AIGradient, Icon } from '@/components';
import { ai, glow, motion, shadow } from '@/theme';
import { easeSpring } from '@/theme/easing';

/** Floating AI-gradient "+" button; rotates to an ✕ when the menu is open. */
export function LogFab({ open, onPress, bottom }: { open: boolean; onPress: () => void; bottom: number }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withTiming(open ? 135 : 0, { duration: motion.durBase, easing: easeSpring });
  }, [open, rot]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <Pressable
      accessibilityLabel={open ? 'Close log menu' : 'Log something'}
      onPress={onPress}
      style={[styles.fab, { bottom }]}
    >
      <AIGradient style={[styles.gradient, glow.ai, shadow.lg]}>
        <Animated.View style={animStyle}>
          <Icon name="plus" size={28} strokeWidth={2.4} color={ai.onGradient} />
        </Animated.View>
      </AIGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 18, width: 58, height: 58, zIndex: 48 },
  gradient: { width: 58, height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
