import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AIGradient } from './AIGradient';
import { Sparkle } from './Sparkle';
import { ai, border, font, fontSize, glow, radius, space, surface, text } from '@/theme';

export interface InsightCardProps {
  title?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  tone?: 'ai' | 'plain';
  children?: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * The signature AI surface: gradient hairline border + soft tint + sparkle
 * eyebrow signal "this came from FitVibe". The gradient border is a gradient
 * backdrop with the card surface inset 1px on top.
 */
export function InsightCard({
  title,
  eyebrow = 'FitVibe AI',
  icon,
  tone = 'ai',
  children,
  footer,
  style,
}: InsightCardProps) {
  const isAI = tone === 'ai';

  const body = (
    <View>
      <View style={styles.eyebrowRow}>
        <AIGradient style={styles.eyebrowIcon}>{icon ?? <Sparkle size={13} />}</AIGradient>
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={styles.bodyText}>{children}</Text> : children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  if (!isAI) {
    return <View style={[styles.plain, style]}>{body}</View>;
  }

  return (
    <AIGradient style={[styles.aiBorder, glow.ai, style]}>
      <View style={styles.aiInner}>
        {/* faint AI tint wash */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: ai.soft, opacity: 0.5, borderRadius: radius.xl - 1 }]} pointerEvents="none" />
        {body}
      </View>
    </AIGradient>
  );
}

const styles = StyleSheet.create({
  plain: {
    borderRadius: radius.xl,
    padding: space[5],
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.subtle,
  },
  aiBorder: { borderRadius: radius.xl, padding: 1 },
  aiInner: { borderRadius: radius.xl - 1, padding: space[5], backgroundColor: surface.card, overflow: 'hidden' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  eyebrowIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.muted },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: text.primary,
    marginBottom: 6,
    letterSpacing: -0.36,
  },
  bodyText: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  footer: { marginTop: 14 },
});
