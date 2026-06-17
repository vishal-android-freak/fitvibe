import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIGradient, ChatMessage, FieldGlow, Icon } from '@/components';
import { ai, border, glow, surface, text } from '@/theme';
import { ChatTopBar } from './ChatTopBar';
import { ReplyChip } from './ReplyChip';
import { TypingBubble } from './TypingBubble';
import { CANNED, DEFAULT_REPLY, FOLLOWUPS, type ChatTurn } from './data';

/** Full-screen Ask FitVibe chat. Optionally seeded with a question that the
 *  assistant immediately answers; smart followup chips + a working composer. */
export function AskConversation({ seed, onClose }: { seed?: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatTurn[]>(() => (seed ? [{ role: 'user', text: seed }] : []));
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  const replyTo = useCallback((textForReply: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { role: 'assistant', text: CANNED[textForReply] ?? DEFAULT_REPLY }]);
    }, 850);
  }, []);

  // Answer the seeded question once on mount.
  useEffect(() => {
    if (seed && !seededRef.current) {
      seededRef.current = true;
      replyTo(seed);
    }
  }, [seed, replyTo]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs, typing]);

  const send = (textToSend?: string) => {
    const t = (textToSend ?? input).trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    replyTo(t);
  };

  const canSend = input.trim().length > 0;

  return (
    <FieldGlow>
      <ChatTopBar title="Ask FitVibe" onClose={onClose} back topInset={insets.top} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => (
            <ChatMessage key={i} role={m.role} text={m.text} />
          ))}
          {typing && <TypingBubble />}
        </ScrollView>

        <View style={styles.followups}>
          {FOLLOWUPS.map((f) => (
            <ReplyChip key={f} onPress={() => send(f)}>
              {f}
            </ReplyChip>
          ))}
        </View>

        <View style={[styles.composer, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            placeholder="Ask about your health…"
            placeholderTextColor={text.tertiary}
            style={styles.input}
            returnKeyType="send"
          />
          <Pressable onPress={() => send()} accessibilityLabel="Send" disabled={!canSend} style={styles.sendWrap}>
            <AIGradient style={[styles.send, canSend ? glow.ai : { opacity: 0.5 }]}>
              <Icon name="arrow-up" size={22} strokeWidth={2.4} color={ai.onGradient} />
            </AIGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </FieldGlow>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: 16, gap: 14 },
  followups: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  input: { flex: 1, height: 48, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.card, color: text.primary, fontFamily: 'Sora_500Medium', fontSize: 17 },
  sendWrap: { width: 48, height: 48 },
  send: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
