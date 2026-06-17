import React, { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';
import { ReadinessPage } from './hero/ReadinessPage';
import { NutritionPage } from './hero/NutritionPage';
import { PageDots } from './hero/PageDots';
import { heroStyles } from './hero/styles';

const PAGES = [ReadinessPage, NutritionPage];

/** Swipeable hero: Readiness · Nutrition, with dot indicators. */
export function HeroCarousel() {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) setIdx(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  return (
    <View onLayout={onLayout}>
      {w > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {PAGES.map((Page, i) => (
            <View key={i} style={[{ width: w }, heroStyles.page]}>
              <Page />
            </View>
          ))}
        </ScrollView>
      )}
      <PageDots count={PAGES.length} active={idx} />
    </View>
  );
}
