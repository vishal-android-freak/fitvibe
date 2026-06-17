import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { GoogleMark } from './GoogleMark';
import { AnimatedPressable, usePressScale } from '@/components/core/AnimatedPressable';
import { Spinner } from '@/components/Spinner';
import { font, fontSize, shadow } from '@/theme';

export interface GoogleButtonProps {
  onPress?: () => void;
  label?: string;
  busy?: boolean;
}

/** The white "Continue with Google" trigger shown on the dark welcome. */
export function GoogleButton({ onPress, label = 'Continue with Google', busy = false }: GoogleButtonProps) {
  const press = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.button, busy && { opacity: 0.7 }, press.animStyle]}
    >
      {busy ? <Spinner size={20} color="#1F2024" /> : <GoogleMark size={22} />}
      <Text style={styles.label}>{busy ? 'Opening Google…' : label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    ...shadow.lg,
  },
  label: { fontFamily: font.sansBold, fontSize: fontSize.md, color: '#1F2024', letterSpacing: -0.15 },
});
