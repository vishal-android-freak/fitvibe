import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIGradient, ChatMessage, FieldGlow, Icon, type IconName } from '@/components';
import { BlockList } from '@/components/ai/BlockRenderer';
import {
  openChat,
  fetchConversationMessages,
  type ChatAttachment,
  type ChatFrame,
  type ChatSocket,
} from '@/data/vaidya';
import type { GenerativeBlock } from '@/data/blocks';
import { accent, ai, border, font, fontSize, glow, radius, surface, text } from '@/theme';
import { ChatTopBar } from './ChatTopBar';
import { TypingBubble } from './TypingBubble';
import { captureImage, pickFiles, pickImages } from './attachments';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  blocks?: GenerativeBlock[];
  attachments?: ChatAttachment[];
}

export function AskConversation({
  seed,
  conversationId,
  onClose,
  onHistory,
}: {
  seed?: string;
  conversationId?: string;
  onClose: () => void;
  onHistory?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Turn[]>(() => (seed ? [{ role: 'user', text: seed }] : []));
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const sockRef = useRef<ChatSocket | null>(null);
  const seededRef = useRef(false);
  const turnOpenRef = useRef(false);

  const intoCurrentTurn = useCallback((mutate: (t: Turn) => Turn) => {
    setMsgs((m) => {
      if (!turnOpenRef.current) {
        turnOpenRef.current = true;
        return [...m, mutate({ role: 'assistant', text: '' })];
      }
      const last = m[m.length - 1];
      if (last && last.role === 'assistant') return [...m.slice(0, -1), mutate(last)];
      return [...m, mutate({ role: 'assistant', text: '' })];
    });
  }, []);

  // On resume, load the prior messages before opening the socket.
  useEffect(() => {
    let cancelled = false;
    if (conversationId) {
      fetchConversationMessages(conversationId, 50).then((prior) => {
        if (!cancelled && prior.length) setMsgs(prior);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Open the chat socket once.
  useEffect(() => {
    let closed = false;
    const onFrame = (f: ChatFrame) => {
      switch (f.type) {
        case 'token':
          intoCurrentTurn((t) => ({ ...t, text: t.text + f.delta }));
          break;
        case 'block':
          intoCurrentTurn((t) => ({ ...t, blocks: [...(t.blocks ?? []), f.block] }));
          break;
        case 'done':
          setTyping(false);
          turnOpenRef.current = false;
          break;
        case 'error':
          intoCurrentTurn((t) => ({ ...t, text: `${t.text}\n\n⚠️ ${f.message}` }));
          setTyping(false);
          turnOpenRef.current = false;
          break;
      }
    };
    openChat({
      onFrame,
      conversationId,
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
    if ((!t && pending.length === 0) || !sockRef.current) return;
    setMsgs((m) => [...m, { role: 'user', text: t, attachments: pending.length ? pending : undefined }]);
    sockRef.current.send(t, pending.length ? pending : undefined);
    setInput('');
    setPending([]);
    setTyping(true);
  };

  const addAttachments = async (picker: () => Promise<ChatAttachment[]>) => {
    try {
      const picked = await picker();
      if (picked.length) setPending((p) => [...p, ...picked].slice(0, 8));
    } catch {
      /* user cancelled / permission denied */
    }
  };

  const openAttachMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Photo Library', 'Camera', 'Files'], cancelButtonIndex: 0 },
        (i) => {
          if (i === 1) addAttachments(pickImages);
          else if (i === 2) addAttachments(captureImage);
          else if (i === 3) addAttachments(pickFiles);
        },
      );
    } else {
      // Android: default to the gallery (a full sheet can come later).
      addAttachments(pickImages);
    }
  };

  const canSend = (input.trim().length > 0 || pending.length > 0) && ready;

  return (
    <FieldGlow>
      <ChatTopBar title="Ask Vaidya" onClose={onClose} back topInset={insets.top} onHistory={onHistory} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {msgs.length === 0 && !typing && <Welcome />}
          {msgs.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              text={m.text || undefined}
              generative={
                m.attachments?.length || m.blocks?.length ? (
                  <>
                    {m.attachments?.length ? <AttachmentRow items={m.attachments} /> : null}
                    {m.blocks?.length ? <BlockList blocks={m.blocks} /> : null}
                  </>
                ) : undefined
              }
            />
          ))}
          {typing && <TypingBubble />}
        </ScrollView>

        {pending.length > 0 && (
          <View style={styles.pendingRow}>
            {pending.map((a, i) => (
              <View key={i} style={styles.thumbWrap}>
                {a.kind === 'image' ? (
                  <Image source={{ uri: `data:${a.mimeType};base64,${a.data}` }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.fileThumb]}>
                    <Icon name="file-text" size={18} color={text.secondary} />
                  </View>
                )}
                <Pressable style={styles.remove} onPress={() => setPending((p) => p.filter((_, j) => j !== i))}>
                  <Icon name="x" size={12} color={text.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(16, insets.bottom) }]}>
          <Pressable onPress={openAttachMenu} accessibilityLabel="Attach" style={styles.attachBtn} disabled={!ready}>
            <Icon name="plus" size={22} color={ready ? text.primary : text.tertiary} />
          </Pressable>
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

/** Empty-state welcome shown before the first message — what Vaidya can do. */
function Welcome() {
  const examples: { icon: IconName; title: string; body: string }[] = [
    { icon: 'moon', title: 'Understand your sleep', body: '“Why did I wake up so often last night?”' },
    { icon: 'activity', title: 'Track recovery & readiness', body: '“Am I recovered enough to train hard today?”' },
    { icon: 'trending-up', title: 'Spot trends & correlations', body: '“How do late dinners affect my deep sleep?”' },
    { icon: 'utensils', title: 'Log meals, water & weight', body: '“Log 2 rotis and dal for lunch.”' },
  ];
  return (
    <View style={styles.welcome}>
      <AIGradient style={styles.welcomeIcon}>
        <Icon name="sparkles" size={26} color={ai.onGradient} />
      </AIGradient>
      <Text style={styles.welcomeTitle}>Ask Vaidya</Text>
      <Text style={styles.welcomeBody}>
        Your AI health coach. I read your real Google Health data — sleep, HRV, heart rate, activity,
        nutrition — and answer grounded in your own numbers. Attach a photo or report to discuss it.
      </Text>
      <View style={styles.examples}>
        {examples.map((e) => (
          <View key={e.title} style={styles.example}>
            <View style={styles.exampleIcon}>
              <Icon name={e.icon} size={18} color={accent.base} />
            </View>
            <View style={styles.exampleText}>
              <Text style={styles.exampleTitle}>{e.title}</Text>
              <Text style={styles.exampleBody}>{e.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Thumbnails for a sent message's attachments. */
function AttachmentRow({ items }: { items: ChatAttachment[] }) {
  return (
    <View style={styles.sentRow}>
      {items.map((a, i) =>
        a.kind === 'image' ? (
          <Image key={i} source={{ uri: `data:${a.mimeType};base64,${a.data}` }} style={styles.sentThumb} />
        ) : (
          <View key={i} style={[styles.sentThumb, styles.fileThumb]}>
            <Icon name="file-text" size={16} color={text.secondary} />
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: 16, gap: 14, flexGrow: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 12 },
  welcomeIcon: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: text.primary },
  welcomeBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.55, color: text.secondary, textAlign: 'center', maxWidth: 320 },
  examples: { alignSelf: 'stretch', gap: 12, marginTop: 12 },
  example: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle, borderRadius: radius.lg, padding: 14 },
  // Match the title's first-line height so the icon centers on the title, not the
  // top of the whole text block.
  exampleIcon: { height: fontSize.base * 1.4, alignItems: 'center', justifyContent: 'center' },
  exampleText: { flex: 1, gap: 2 },
  exampleTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.base, lineHeight: fontSize.base * 1.4, color: text.primary },
  exampleBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  attachBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 48, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: border.strong, backgroundColor: surface.card, color: text.primary, fontFamily: 'Sora_500Medium', fontSize: 17 },
  sendWrap: { width: 48, height: 48 },
  send: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pendingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: surface.card },
  fileThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: border.subtle },
  remove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999, backgroundColor: surface.raised, borderWidth: 1, borderColor: border.strong, alignItems: 'center', justifyContent: 'center' },
  sentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sentThumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: surface.card },
});
