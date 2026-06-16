import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { accent, border, surface } from '@/theme';
import { easeSpring } from '@/theme/easing';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

/** Settings toggle. Knob springs across; track fills accent when on. */
export function Switch({ checked = false, onChange, disabled = false }: SwitchProps) {
  const pos = useSharedValue(checked ? 23 : 3);
  useEffect(() => {
    pos.value = withTiming(checked ? 23 : 3, { duration: 220, easing: easeSpring });
  }, [checked, pos]);

  const knob = useAnimatedStyle(() => ({ left: pos.value }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      disabled={disabled}
      onPress={() => !disabled && onChange?.(!checked)}
      style={[
        styles.track,
        { backgroundColor: checked ? accent.base : surface.raised, opacity: disabled ? 0.5 : 1 },
        !checked && { borderWidth: 1, borderColor: border.subtle },
      ]}
    >
      <Animated.View style={[styles.knob, knob]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 999, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 3,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
});
