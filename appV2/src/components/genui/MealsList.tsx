import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { border, font, fontSize, hue, radius, surface, text, tint } from '@/theme';

export interface Meal {
  meal: string;
  item: string;
  time: string;
  kcal: number;
  icon: IconName;
}

/** A card listing logged meals (name, description, kcal, time). Generative-UI block. */
export function MealsList({ meals, style }: { meals: Meal[]; style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      {meals.map((m, i) => (
        <View key={m.meal + i} style={[styles.row, i > 0 && styles.divider]}>
          <View style={[styles.icon, { backgroundColor: tint(hue.nutrition, 0.16) }]}>
            <Icon name={m.icon} size={18} color={hue.nutrition} />
          </View>
          <View style={styles.main}>
            <Text style={styles.name}>{m.meal}</Text>
            <Text style={styles.item} numberOfLines={1}>
              {m.item}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.kcal}>{m.kcal}</Text>
            <Text style={styles.time}>{m.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, backgroundColor: surface.card, borderWidth: 1, borderColor: border.subtle, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  divider: { borderTopWidth: 1, borderTopColor: border.subtle },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  item: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
  right: { alignItems: 'flex-end' },
  kcal: { fontFamily: font.display, fontSize: fontSize.sm, color: text.primary },
  time: { fontFamily: font.mono, fontSize: fontSize['2xs'], color: text.tertiary },
});
