import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AIGradient } from './AIGradient';
import { Sparkle } from './Sparkle';
import { MarkdownText } from './MarkdownText';
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
    <View style={[styles.wrap, style]}>
      {/* Bubble row: avatar + the text bubble, capped at 84% width. */}
      {body != null && (
        <View style={[styles.row, { flexDirection: isUser ? 'row-reverse' : 'row' }]}>
          {avatar && !isUser && (
            <AIGradient style={styles.avatar}>
              <Sparkle size={13} />
            </AIGradient>
          )}
          <View style={[styles.col, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
            <View
              style={[
                styles.bubble,
                isUser
                  ? { backgroundColor: accent.base, borderBottomRightRadius: 6, ...glow.accent }
                  : { backgroundColor: surface.raised, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: border.subtle },
              ]}
            >
              {typeof body !== 'string' ? (
                body
              ) : isUser ? (
                <Text style={[styles.text, { color: text.onAccent, fontFamily: font.sansSemibold }]}>{body}</Text>
              ) : (
                // Assistant text is markdown (headings, lists, bold, code, links).
                <MarkdownText color={text.secondary}>{body}</MarkdownText>
              )}
            </View>
          </View>
        </View>
      )}
      {/* Generative UI renders at FULL row width (not capped to the bubble),
          so charts/cards span the screen. Indented to align with the bubble. */}
      {generative ? <View style={[styles.gen, !isUser && avatar ? styles.genIndent : null]}>{generative}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { gap: 9, alignItems: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  col: { maxWidth: '84%', gap: 8 },
  bubble: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20 },
  text: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5 },
  gen: { width: '100%' },
  genIndent: { paddingLeft: 37 }, // 28 avatar + 9 gap, so blocks align with the bubble
});
