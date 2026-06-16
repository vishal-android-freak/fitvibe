import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { Screen } from './Screen';
import { Icon, type IconName } from '@/components/Icon';
import { accent, font, fontSize, text } from '@/theme';

/** Temporary screen scaffold until the real content lands. */
export function Placeholder({ title, icon }: { title: string; icon: IconName }) {
  return (
    <ScreenContainer>
      <Screen>
        <View style={styles.center}>
          <Icon name={icon} size={40} color={accent.base} strokeWidth={1.75} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>Coming together, screen by screen.</Text>
        </View>
      </Screen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 160, gap: 12 },
  title: { fontFamily: font.display, fontSize: fontSize['2xl'], color: text.primary },
  sub: { fontFamily: font.sansRegular, fontSize: fontSize.base, color: text.tertiary },
});
