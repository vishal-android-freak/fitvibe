import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components';
import { fetchConversations, type ConversationSummary } from '@/data/vaidya';
import { accent, border, font, fontSize, radius, surface, text } from '@/theme';
import { ChatTopBar } from './ChatTopBar';

/** Relative "time ago" from an ISO timestamp. */
function ago(iso: string): string {
  const d = Date.now() - Date.parse(iso);
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** Last-7-days conversation list, newest first. Tap to resume. */
export function ConversationHistory({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConversations().then((c) => {
      if (!cancelled) setItems(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.root}>
      <ChatTopBar title="History" onClose={onClose} back topInset={insets.top} />
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
        {items === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={accent.base} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>Your chats with Vaidya from the last 7 days will show here.</Text>
          </View>
        ) : (
          items.map((c) => (
            <Pressable key={c.id} style={styles.row} onPress={() => onPick(c.id)}>
              <View style={styles.rowText}>
                <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.preview} numberOfLines={1}>{c.preview}</Text>
              </View>
              <Text style={styles.time}>{ago(c.lastAt)}</Text>
              <Icon name="chevron-right" size={18} color={text.tertiary} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.bgApp },
  list: { padding: 16, gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60 },
  emptyTitle: { fontFamily: font.sansSemibold, fontSize: fontSize.md, color: text.secondary },
  emptyBody: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted, textAlign: 'center', maxWidth: 280 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle },
  rowText: { flex: 1, gap: 3 },
  title: { fontFamily: font.sansSemibold, fontSize: fontSize.base, color: text.primary },
  preview: { fontFamily: font.sansRegular, fontSize: fontSize.sm, color: text.muted },
  time: { fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
});
