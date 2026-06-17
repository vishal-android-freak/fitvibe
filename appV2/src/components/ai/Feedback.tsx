import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { accent, text } from '@/theme';

export type Vote = 'up' | 'down' | null;

/** Thumbs up/down feedback control (optionally with a trailing "more" button). */
export function Feedback({
  size = 32,
  showMore = false,
  spread = false,
  onVote,
  style,
}: {
  size?: number;
  /** show a trailing ellipsis "more" button and space it to the right */
  showMore?: boolean;
  /** justify votes left and "more" right (analysis layout) */
  spread?: boolean;
  onVote?: (v: Vote) => void;
  style?: ViewStyle;
}) {
  const [vote, setVote] = useState<Vote>(null);
  const pick = (v: 'up' | 'down') => {
    const next = vote === v ? null : v;
    setVote(next);
    onVote?.(next);
  };
  const btn = (v: 'up' | 'down', icon: 'thumbs-up' | 'thumbs-down') => {
    const on = vote === v;
    return (
      <Pressable
        onPress={() => pick(v)}
        accessibilityLabel={v}
        style={[styles.btn, { width: size, height: size }, on && { backgroundColor: accent.soft }]}
      >
        <Icon name={icon} size={Math.round(size * 0.47)} color={on ? accent.base : text.muted} />
      </Pressable>
    );
  };
  return (
    <View style={[styles.row, spread && styles.spread, style]}>
      <View style={styles.votes}>
        {btn('up', 'thumbs-up')}
        {btn('down', 'thumbs-down')}
      </View>
      {showMore && (
        <Pressable accessibilityLabel="More" style={[styles.btn, { width: size, height: size }]}>
          <Icon name="ellipsis-vertical" size={Math.round(size * 0.47)} color={text.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spread: { justifyContent: 'space-between', flex: 1 },
  votes: { flexDirection: 'row', gap: 4 },
  btn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
