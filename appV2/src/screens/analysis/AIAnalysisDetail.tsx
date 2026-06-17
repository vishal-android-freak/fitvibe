import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feedback, FieldGlow, Icon } from '@/components';
import { accent, border, font, fontSize, glass, text } from '@/theme';
import type { Seg } from '@/screens/insights/data';
import { ChatTopBar } from '@/screens/ask/ChatTopBar';
import { ReplyChip } from '@/screens/ask/ReplyChip';
import { GenBlocks } from './GenBlocks';
import { ANALYSES, type AnalysisId } from './data';

function Rich({ segs, style }: { segs: Seg[]; style: any }) {
  return (
    <Text style={style}>
      {segs.map((s, i) => (
        <Text key={i} style={s.b ? styles.bold : undefined}>
          {s.t}
        </Text>
      ))}
    </Text>
  );
}

/** Rich AI analysis view opened from an AI card; smart replies continue into chat. */
export function AIAnalysisDetail({ id, onClose, onContinue }: { id: AnalysisId; onClose: () => void; onContinue: (seed: string) => void }) {
  const insets = useSafeAreaInsets();
  const a = ANALYSES[id] ?? ANALYSES.sleep;

  return (
    <FieldGlow>
      <ChatTopBar title="FitVibe" onClose={onClose} topInset={insets.top} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.eyebrowRow}>
          <Icon name="sparkles" size={13} color={accent.base} />
          <Text style={styles.eyebrow}>FITVIBE · {a.time}</Text>
        </View>

        <Text style={styles.headline}>{a.headline}</Text>
        <Rich segs={a.body} style={styles.body} />

        <View style={styles.bullets}>
          {a.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Rich segs={b} style={styles.bulletText} />
            </View>
          ))}
        </View>

        <Text style={styles.question}>{a.question}</Text>

        <GenBlocks gen={a.gen} />

        <View style={styles.feedback}>
          <Feedback size={38} showMore spread />
        </View>
        <Text style={styles.disclaimer}>
          FitVibe can make mistakes and does not provide medical advice. Check important information with a clinician.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(14, insets.bottom) }]}>
        {a.replies.map((r) => (
          <ReplyChip key={r} onPress={() => onContinue(r)}>
            {r}
          </ReplyChip>
        ))}
        <ReplyChip icon="reply" onPress={() => onContinue('')}>
          Reply
        </ReplyChip>
      </View>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.muted },
  headline: { fontFamily: font.display, fontSize: fontSize['2xl'], lineHeight: fontSize['2xl'] * 1.2, letterSpacing: -0.4, color: text.primary, marginBottom: 12 },
  body: { fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary, marginBottom: 14 },
  bold: { fontFamily: font.sansBold, color: text.primary },
  bullets: { gap: 12, marginBottom: 16 },
  bulletRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: accent.base, marginTop: 9 },
  bulletText: { flex: 1, fontFamily: font.sansRegular, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary },
  question: { fontFamily: font.sansSemibold, fontSize: fontSize.md, lineHeight: fontSize.md * 1.65, color: text.secondary, marginBottom: 4 },
  feedback: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: border.subtle },
  disclaimer: { fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.5, color: text.tertiary, marginTop: 14 },
  footer: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: border.subtle, backgroundColor: glass.bar },
});
