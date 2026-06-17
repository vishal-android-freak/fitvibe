import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Button, Icon } from '@/components';
import { AnimatedPressable } from '@/components/core/AnimatedPressable';
import { border, font, fontSize, hue, shadow, surface, text, tint } from '@/theme';
import { FoodBody, WalkBody, WaterBody, WeightBody, WorkoutBody } from './bodies';
import { LOG_ACTIONS, type LogKind } from './types';

const META: Record<LogKind, { title: string; confirm: string; hue: string; Body: React.FC; done: string }> = {
  food: { title: 'Log food', confirm: 'Add to log', hue: hue.nutrition, Body: FoodBody, done: "Food added to today's log" },
  workout: { title: 'Log workout', confirm: 'Save workout', hue: hue.move, Body: WorkoutBody, done: 'Workout saved' },
  walk: { title: 'Log a walk', confirm: 'Save walk', hue: hue.oxygen, Body: WalkBody, done: 'Walk saved' },
  water: { title: 'Log water', confirm: 'Add water', hue: hue.hydration, Body: WaterBody, done: 'Water logged' },
  weight: { title: 'Log weight', confirm: 'Save weight', hue: hue.sky, Body: WeightBody, done: 'Weight saved' },
};

/** Bottom-sheet that hosts a per-kind log form. Confirms with a toast message. */
export function LogSheet({ kind, onClose, onConfirm }: { kind: LogKind | null; onClose: () => void; onConfirm: (msg: string) => void }) {
  if (!kind) return null;
  const meta = META[kind];
  const actionIcon = LOG_ACTIONS.find((a) => a.id === kind)?.icon ?? 'plus';

  return (
    <>
      <AnimatedPressable entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} onPress={onClose} style={styles.scrim} />
      <Animated.View entering={SlideInDown.duration(320)} exiting={SlideOutDown.duration(280)} style={styles.sheet}>
        <View style={styles.grabberWrap}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: tint(meta.hue, 0.18) }]}>
              <Icon name={actionIcon} size={18} color={meta.hue} />
            </View>
            <Text style={styles.title}>{meta.title}</Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Close" style={styles.close}>
            <Icon name="x" size={18} color={text.primary} />
          </Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <meta.Body />
        </ScrollView>
        <View style={styles.footer}>
          <Button variant="ai" size="lg" block onPress={() => onConfirm(meta.done)}>
            {meta.confirm}
          </Button>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, backgroundColor: 'rgba(3,5,9,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 81, maxHeight: '86%', backgroundColor: surface.overlay, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: border.subtle, ...shadow.lg },
  grabberWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  grabber: { width: 40, height: 5, borderRadius: 999, backgroundColor: border.strong },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: fontSize.xl, color: text.primary },
  close: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.raised, alignItems: 'center', justifyContent: 'center' },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: border.subtle },
});
