import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/components';
import { useResponsive } from '@/theme';
import { INSIGHT_CATS, type CatId } from './data';

/** Horizontally scrollable category filter chips. */
export function FilterChips({ value, onChange }: { value: CatId; onChange: (c: CatId) => void }) {
  const { gutter } = useResponsive();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      style={{ marginHorizontal: -gutter }}
    >
      {INSIGHT_CATS.map((c) => (
        <Chip key={c.id} selected={value === c.id} onPress={() => onChange(c.id)}>
          {c.label}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, paddingBottom: 2 },
});
