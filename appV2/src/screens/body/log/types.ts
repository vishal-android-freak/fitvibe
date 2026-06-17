import { hue } from '@/theme';
import type { IconName } from '@/components';

export type LogKind = 'food' | 'workout' | 'walk' | 'water' | 'weight';

export const LOG_ACTIONS: { id: LogKind; icon: IconName; hue: string; label: string }[] = [
  { id: 'food', icon: 'utensils', hue: hue.nutrition, label: 'Log food' },
  { id: 'workout', icon: 'dumbbell', hue: hue.move, label: 'Log workout' },
  { id: 'walk', icon: 'footprints', hue: hue.oxygen, label: 'Log a walk' },
  { id: 'water', icon: 'glass-water', hue: hue.hydration, label: 'Log water' },
  { id: 'weight', icon: 'scale', hue: hue.sky, label: 'Log weight' },
];
