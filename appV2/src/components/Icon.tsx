import React from 'react';
import type { LucideProps } from 'lucide-react-native';
import {
  Activity,
  ArrowUp,
  Bed,
  Brain,
  Calendar,
  ChartLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  GlassWater,
  Gauge,
  Hammer,
  Heart,
  HeartPulse,
  House,
  Info,
  Lightbulb,
  Lock,
  Moon,
  Pencil,
  Plus,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Sunrise,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Utensils,
  Watch,
  Wind,
  X,
} from 'lucide-react-native';
import { text } from '@/theme';

/** Registry of every Lucide icon the app uses, keyed by the prototype's names. */
const REGISTRY = {
  activity: Activity,
  'arrow-up': ArrowUp,
  bed: Bed,
  brain: Brain,
  calendar: Calendar,
  'chart-line': ChartLine,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  droplet: Droplet,
  dumbbell: Dumbbell,
  flame: Flame,
  footprints: Footprints,
  gauge: Gauge,
  'glass-water': GlassWater,
  hammer: Hammer,
  heart: Heart,
  'heart-pulse': HeartPulse,
  house: House,
  info: Info,
  lightbulb: Lightbulb,
  lock: Lock,
  moon: Moon,
  pencil: Pencil,
  plus: Plus,
  route: Route,
  scale: Scale,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  sunrise: Sunrise,
  'thumbs-down': ThumbsDown,
  'thumbs-up': ThumbsUp,
  'trending-up': TrendingUp,
  trophy: Trophy,
  user: User,
  'user-plus': UserPlus,
  utensils: Utensils,
  watch: Watch,
  wind: Wind,
  x: X,
} as const;

export type IconName = keyof typeof REGISTRY;

export interface IconProps extends Omit<LucideProps, 'name'> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Lucide icon, rounded ~2px stroke, colored by metric hue. The product's single
 * icon system — no emoji anywhere.
 */
export function Icon({ name, size = 20, color = text.primary, strokeWidth = 2, ...rest }: IconProps) {
  const LucideIcon = REGISTRY[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} {...rest} />;
}
