import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { accent, font, fontSize, text } from '@/theme';

export interface SectionLabelProps {
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
}

/** Tracked-out uppercase eyebrow + optional accent action link. */
export function SectionLabel({ children, action, onAction }: SectionLabelProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.eyebrow}>{String(children).toUpperCase()}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, paddingHorizontal: 2 },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary },
  action: { fontFamily: font.sansBold, fontSize: fontSize.xs, color: accent.base, letterSpacing: 0.4 },
});
