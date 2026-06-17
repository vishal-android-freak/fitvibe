import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { AIGradient } from '@/components/ai/AIGradient';
import { Icon, type IconName } from '@/components/Icon';
import { ai, font, fontSize, glass, radius, shadow, text } from '@/theme';

/** Glass confirmation toast; auto-dismisses after `duration` ms. */
export function Toast({
  message,
  icon = 'check',
  onClose,
  duration = 2400,
  bottom = 100,
}: {
  message: string;
  icon?: IconName;
  onClose: () => void;
  duration?: number;
  bottom?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(220)} style={[styles.toast, { bottom }]}>
      <AIGradient style={styles.icon}>
        <Icon name={icon} size={17} strokeWidth={2.6} color={ai.onGradient} />
      </AIGradient>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 18, right: 18, zIndex: 90, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: glass.bar, borderWidth: 1, borderColor: glass.border, ...shadow.lg },
  icon: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { flex: 1, fontFamily: font.sansSemibold, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.35, color: text.secondary },
});
