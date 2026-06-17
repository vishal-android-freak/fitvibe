import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FieldGlow, Icon } from '@/components';
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

function Feedback() {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const btn = (v: 'up' | 'down', icon: 'thumbs-up' | 'thumbs-down') => {
    const on = vote === v;
    return (
      <Pressable onPress={() => setVote(on ? null : v)} accessibilityLabel={v} style={[styles.fbBtn, on && { backgroundColor: accent.soft }]}>
        <Icon name={icon} size={18} color={on ? accent.base : text.muted} />
      </Pressable>
    );
  };
  return (
    <View style={styles.feedback}>
      <View style={styles.votes}>
        {btn('up', 'thumbs-up')}
        {btn('down', 'thumbs-down')}
      </View>
      <Pressable accessibilityLabel="More" style={styles.fbBtn}>
        <Icon name="ellipsis-vertical" size={18} color={text.muted} />
      </Pressable>
    </View>
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

        <Feedback />
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
  feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 14, borderTopWidth: 1, borderTopColor: border.subtle },
  votes: { flexDirection: 'row', gap: 4 },
  fbBtn: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontFamily: font.sansRegular, fontSize: fontSize.xs, lineHeight: fontSize.xs * 1.5, color: text.tertiary, marginTop: 14 },
  footer: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: border.subtle, backgroundColor: glass.bar },
});
