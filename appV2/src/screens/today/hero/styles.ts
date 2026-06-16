import { StyleSheet } from 'react-native';

/** Shared frame for every hero carousel page — owned by the carousel so the
 *  pages describe only their content and stay equal height (no scroll jitter). */
export const HERO_PAGE_HEIGHT = 286;

export const heroStyles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center', minHeight: HERO_PAGE_HEIGHT, paddingVertical: 4 },
});
