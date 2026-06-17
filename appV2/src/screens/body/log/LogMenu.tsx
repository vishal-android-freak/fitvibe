import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { Icon } from '@/components';
import { border, font, fontSize, shadow, surface, text, tint } from '@/theme';
import { LOG_ACTIONS, type LogKind } from './types';

/** Scrim + stacked action pills shown above the FAB when the menu is open. */
export function LogMenu({ open, onClose, onPick, bottom }: { open: boolean; onClose: () => void; onPick: (k: LogKind) => void; bottom: number }) {
  if (!open) return null;
  return (
    <>
      <AnimatedPressable
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        onPress={onClose}
        style={styles.scrim}
      />
      <View style={[styles.menu, { bottom }]} pointerEvents="box-none">
        {LOG_ACTIONS.map((a, i) => (
          <Animated.View key={a.id} entering={SlideInDown.delay(i * 40).springify().damping(16)}>
            <Pressable onPress={() => onPick(a.id)} style={styles.action}>
              <View style={[styles.actionIcon, { backgroundColor: tint(a.hue, 0.18) }]}>
                <Icon name={a.icon} size={19} color={a.hue} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 46, backgroundColor: 'rgba(3,5,9,0.5)' },
  menu: { position: 'absolute', right: 18, zIndex: 47, alignItems: 'flex-end', gap: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingLeft: 9, paddingRight: 16, borderRadius: 999, borderWidth: 1, borderColor: border.subtle, backgroundColor: surface.overlay, ...shadow.md },
  actionIcon: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.primary },
});
