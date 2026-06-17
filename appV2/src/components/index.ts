// Core
export { Button } from './core/Button';
export { Card } from './core/Card';
export { Badge } from './core/Badge';
export { Chip } from './core/Chip';
export { Avatar } from './core/Avatar';
export { Switch } from './core/Switch';
export { IconButton } from './core/IconButton';

// Data viz — primitives + composite metric blocks. Every one is presentational
// and props-driven, so any of these can be rendered as a generative-UI block
// (inline in chat replies / AI analyses), not just the composite ones.
export { ProgressRing } from './data/ProgressRing';
export type { Ring } from './data/ProgressRing';
export { Sparkline } from './data/Sparkline';
export { StatTile } from './data/StatTile';
export { BarChart } from './data/BarChart';
export { GaugeArc } from './data/GaugeArc';
export { Hypnogram, SAMPLE_SLEEP_SEGMENTS, SAMPLE_ONSET_CLOCK } from './data/Hypnogram';
export type { SleepStage, SleepSegment, HypnogramProps, TypicalByStage } from './data/Hypnogram';
export { ActivityRings } from './data/ActivityRings';
export type { ActivityRing, ActivityRingsProps } from './data/ActivityRings';
export { ReadinessCard } from './data/ReadinessCard';
export type { ReadinessFactor, ReadinessCardProps } from './data/ReadinessCard';
export { HeartMetrics } from './data/HeartMetrics';
export type { HeartTile, HeartMetricsProps } from './data/HeartMetrics';
export { MacroRings, MacroRing } from './data/MacroRings';
export type { Macro } from './data/MacroRings';
export { MicroBars, MicroBar } from './data/MicroBars';
export type { Micro } from './data/MicroBars';
export { CalorieBudget } from './data/CalorieBudget';
export { MealsList } from './data/MealsList';
export type { Meal } from './data/MealsList';
export { StreakDots } from './data/StreakDots';
export type { StreakDotsProps } from './data/StreakDots';
export { MiniRing } from './data/MiniRing';
export type { MiniRingProps } from './data/MiniRing';
export { EcgTrace } from './data/EcgTrace';
export type { EcgTraceProps } from './data/EcgTrace';
export { StatTileGrid } from './data/StatTileGrid';
export type { StatTileSpec, StatTileGridProps } from './data/StatTileGrid';
export { SessionList } from './data/SessionList';
export type { Session } from './data/SessionList';
export { ScoreHero } from './data/ScoreHero';
export type { ScoreHeroProps } from './data/ScoreHero';
export { TrendCard } from './data/TrendCard';
export type { TrendStat, TrendCardProps } from './data/TrendCard';
export { ScheduleCompare } from './data/ScheduleCompare';
export type { ScheduleItem } from './data/ScheduleCompare';
export { TrainingLoad } from './data/TrainingLoad';
export type { TrainingLoadProps } from './data/TrainingLoad';
export { RecoverySignals } from './data/RecoverySignals';
export type { RecoverySignal, RecoverySignalsProps } from './data/RecoverySignals';
export { SleepDurationCard } from './data/SleepDurationCard';
export type { SleepDurationCardProps } from './data/SleepDurationCard';

// AI
export { InsightCard } from './ai/InsightCard';
export { ChatMessage } from './ai/ChatMessage';
export { AIGradient } from './ai/AIGradient';
export { Sparkle } from './ai/Sparkle';
export { TypeTag } from './ai/TypeTag';
export { Feedback } from './ai/Feedback';
export type { Vote } from './ai/Feedback';
export { RichText } from './ai/RichText';
export type { Seg } from './ai/RichText';

// Brand
export { AppIcon } from './brand/AppIcon';
export { LogoMark } from './brand/LogoMark';
export { Wordmark } from './brand/Wordmark';

// Layout / shared
export { Icon } from './Icon';
export type { IconName } from './Icon';
export { Spinner } from './Spinner';
export { Rise } from './Rise';
export { Toast } from './Toast';
export { FieldGlow } from './FieldGlow';
export { ScreenContainer } from './layout/ScreenContainer';
export { Screen, NAV_CLEARANCE } from './layout/Screen';
export { SectionLabel } from './layout/SectionLabel';
export { BottomNav, NAV_ITEMS } from './layout/BottomNav';
