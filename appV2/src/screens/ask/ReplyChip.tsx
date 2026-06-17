import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components';
import { AnimatedPressable } from '@/components/core/AnimatedPressable';
import { accent, border, font, fontSize, motion, text } from '@/theme';

/** A pill that suggests a follow-up question; tinted on press. */
export function ReplyChip({ children, icon, onPress }: { children: React.ReactNode; icon?: IconName; onPress?: () => void }) {
  const scale = useSharedValue(1);
  const bg = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bg.value ? accent.soft : 'transparent',
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: motion.durFast });
        bg.value = 1;
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.durFast });
        bg.value = 0;
      }}
      style={[styles.chip, animStyle]}
    >
      {icon ? <Icon name={icon} size={15} color={text.secondary} /> : null}
      <Text style={styles.label}>{children}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: border.strong },
  label: { fontFamily: font.sansSemibold, fontSize: fontSize.sm, color: text.secondary },
});
