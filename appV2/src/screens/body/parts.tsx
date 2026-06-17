import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, StatTile, type IconName } from '@/components';
import { font, fontSize, text } from '@/theme';

/** Section eyebrow with an optional right-aligned note. */
export function Eyebrow({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <View style={styles.eyebrowRow}>
      <Text style={styles.eyebrow}>{String(children).toUpperCase()}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

export interface TileProps {
  label: string;
  value: string;
  unit?: string;
  hue: string;
  icon: IconName;
  delta?: string;
  deltaDir?: 'up' | 'down';
  goal?: string;
  spark?: number[];
}

/** A metric StatTile with the Body section's icon convention. */
export function Tile({ label, value, unit, hue, icon, delta, deltaDir, goal, spark }: TileProps) {
  return (
    <StatTile
      label={label}
      value={value}
      unit={unit}
      hue={hue}
      icon={<Icon name={icon} size={16} color={hue} />}
      delta={delta}
      deltaDir={deltaDir}
      goal={goal}
      spark={spark}
    />
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 11, paddingHorizontal: 2 },
  eyebrow: { fontFamily: font.sansBold, fontSize: fontSize['2xs'], letterSpacing: 1.6, color: text.tertiary },
  note: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted },
});
