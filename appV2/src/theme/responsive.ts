import { useWindowDimensions } from 'react-native';

/**
 * Responsive breakpoints. The FitVibe layout is a single mobile-first column
 * capped at `maxContent`; on tablet / iPad / web we keep that column centered
 * rather than stretching the UI, and bump the gutter a little for breathing room.
 */
export const breakpoints = {
  /** phones below this stay full-bleed edge to edge */
  compact: 600,
  /** tablets / large windows */
  expanded: 900,
} as const;

export interface Responsive {
  width: number;
  height: number;
  /** true on small phones */
  isCompact: boolean;
  /** true on tablets / iPad / wide web */
  isExpanded: boolean;
  /** side gutter to use for the current width */
  gutter: number;
  /** max width the content column is allowed to grow to */
  maxContent: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isCompact = width < breakpoints.compact;
  const isExpanded = width >= breakpoints.expanded;
  return {
    width,
    height,
    isCompact,
    isExpanded,
    gutter: isCompact ? 14 : 18,
    // Let the column breathe a touch on big screens but keep the mobile feel.
    maxContent: isExpanded ? 480 : 440,
  };
}
