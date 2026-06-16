import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AIGradient } from './AIGradient';
import { Sparkle } from './Sparkle';
import { accent, border, font, fontSize, glow, surface, text } from '@/theme';

export interface ChatMessageProps {
  role?: 'user' | 'assistant';
  text?: React.ReactNode;
  /** generative UI (charts/tiles) rendered below the bubble */
  generative?: React.ReactNode;
  avatar?: boolean;
  style?: ViewStyle;
}

/**
 * Chat bubble. User = accent-filled, right-aligned. Assistant = soft left
 * surface with a sparkle avatar; can host generative UI below the text.
 */
export function ChatMessage({ role = 'assistant', text: body, generative, avatar = true, style }: ChatMessageProps) {
  const isUser = role === 'user';
  return (
    <View style={[styles.row, { flexDirection: isUser ? 'row-reverse' : 'row' }, style]}>
      {avatar && !isUser && (
        <AIGradient style={styles.avatar}>
          <Sparkle size={13} />
        </AIGradient>
      )}
      <View style={[styles.col, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
        {body != null && (
          <View
            style={[
              styles.bubble,
              isUser
                ? { backgroundColor: accent.base, borderBottomRightRadius: 6, ...glow.accent }
                : { backgroundColor: surface.raised, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: border.subtle },
            ]}
          >
            {typeof body === 'string' ? (
              <Text
                style={[
                  styles.text,
                  { color: isUser ? text.onAccent : text.secondary, fontFamily: isUser ? font.sansSemibold : font.sansRegular },
                ]}
              >
                {body}
              </Text>
            ) : (
              body
            )}
          </View>
        )}
        {generative ? <View style={styles.gen}>{generative}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 9, alignItems: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  col: { maxWidth: '84%', gap: 8 },
  bubble: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20 },
  text: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  gen: { width: '100%', minWidth: 220 },
});
