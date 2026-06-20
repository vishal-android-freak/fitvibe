import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIGradient, ChatMessage, FieldGlow, Icon } from '@/components';
import { BlockList } from '@/components/ai/BlockRenderer';
import { openChat, type ChatFrame, type ChatSocket } from '@/data/vaidya';
import type { GenerativeBlock } from '@/data/blocks';
import { ai, border, glow, surface, text } from '@/theme';
import { ChatTopBar } from './ChatTopBar';
import { ReplyChip } from './ReplyChip';
import { TypingBubble } from './TypingBubble';
import { FOLLOWUPS } from './data';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  blocks?: GenerativeBlock[];
}

/** Full-screen Ask FitVibe chat — live, over the Vaidya WebSocket. Streams the
 *  assistant's tokens + generative-UI blocks. Optionally seeded with a question. */
export function AskConversation({ seed, onClose }: { seed?: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Turn[]>(() => (seed ? [{ role: 'user', text: seed }] : []));
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sockRef = useRef<ChatSocket | null>(null);
  const seededRef = useRef(false);

  // Append a delta to the last assistant turn (creating one if needed).
  const appendToken = useCallback((delta: string) => {
    setMsgs((m) => {
      const last = m[m.length - 1];
      if (last && last.role === 'assistant') {
        return [...m.slice(0, -1), { ...last, text: last.text + delta }];
      }
      return [...m, { role: 'assistant', text: delta }];
    });
  }, []);

  const appendBlock = useCallback((block: GenerativeBlock) => {
    setMsgs((m) => {
      const last = m[m.length - 1];
      if (last && last.role === 'assistant') {
        return [...m.slice(0, -1), { ...last, blocks: [...(last.blocks ?? []), block] }];
      }
      return [...m, { role: 'assistant', text: '', blocks: [block] }];
    });
  }, []);

  // Open the chat socket once.
  useEffect(() => {
    let closed = false;
    const onFrame = (f: ChatFrame) => {
      switch (f.type) {
        case 'token':
          setTyping(false);
          appendToken(f.delta);
          break;
        case 'block':
          appendBlock(f.block);
          break;
        case 'done':
          setTyping(false);
          break;
        case 'error':
          setTyping(false);
          appendToken(`\n\n⚠️ ${f.message}`);
          break;
      }
    };
    openChat({
      onFrame,
      onOpen: () => {
        if (closed) return;
        setReady(true);
        if (seed && !seededRef.current) {
          seededRef.current = true;
          setTyping(true);
          sockRef.current?.send(seed);
        }
      },
      onClose: () => setReady(false),
    }).then((s) => {
      if (closed) {
        s.close();
        return;
      }
      sockRef.current = s;
    });
    return () => {
      closed = true;
      sockRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [msgs, typing]);

  const send = (textToSend?: string) => {
    const t = (textToSend ?? input).trim();
    if (!t || !sockRef.current) return;
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    setTyping(true);
    sockRef.current.send(t);
  };

  const canSend = input.trim().length > 0 && ready;

  return (
    <FieldGlow>
      <ChatTopBar title="Ask Vaidya" onClose={onClose} back topInset={insets.top} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              text={m.text || undefined}
              generative={m.blocks?.length ? <BlockList blocks={m.blocks} /> : undefined}
            />
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
            placeholder={ready ? 'Ask about your health…' : 'Connecting…'}
            placeholderTextColor={text.tertiary}
            style={styles.input}
            returnKeyType="send"
            editable={ready}
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
