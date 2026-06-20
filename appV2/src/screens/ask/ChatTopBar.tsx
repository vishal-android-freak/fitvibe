import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AIGradient, Icon } from '@/components';
import { ai, border, font, fontSize, glass, text } from '@/theme';

/** Glass top bar for the chat / analysis screens. `back` shows a chevron, else ✕.
 *  When `onHistory` is given, a history icon is shown at the top-right. */
export function ChatTopBar({
  title,
  onClose,
  back = false,
  topInset = 0,
  onHistory,
}: {
  title: string;
  onClose: () => void;
  back?: boolean;
  topInset?: number;
  onHistory?: () => void;
}) {
  return (
    <BlurView intensity={Platform.OS === 'android' ? 0 : 40} tint="dark" style={[styles.bar, { paddingTop: topInset + 8 }]}>
      <Pressable onPress={onClose} accessibilityLabel={back ? 'Back' : 'Close'} style={styles.btn}>
        <Icon name={back ? 'chevron-left' : 'x'} size={22} color={text.primary} />
      </Pressable>
      <View style={styles.titleWrap}>
        <AIGradient style={styles.icon}>
          <Icon name="heart-pulse" size={13} color={ai.onGradient} />
        </AIGradient>
        <Text style={styles.title}>{title}</Text>
      </View>
      {onHistory && (
        <Pressable onPress={onHistory} accessibilityLabel="Conversation history" style={[styles.btn, styles.right]}>
          <Icon name="clock" size={21} color={text.primary} />
        </Pressable>
      )}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: border.subtle, backgroundColor: glass.bar },
  btn: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  right: { marginLeft: 'auto' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontFamily: font.display, fontSize: fontSize.md, color: text.primary },
});
