// Core
export { Button } from './core/Button';
export { Card } from './core/Card';
export { Badge } from './core/Badge';
export { Chip } from './core/Chip';
export { Avatar } from './core/Avatar';
export { Switch } from './core/Switch';
export { IconButton } from './core/IconButton';

// Data viz
export { ProgressRing } from './data/ProgressRing';
export type { Ring } from './data/ProgressRing';
export { Sparkline } from './data/Sparkline';
export { StatTile } from './data/StatTile';
export { BarChart } from './data/BarChart';
export { GaugeArc } from './data/GaugeArc';
export { Hypnogram, SAMPLE_SLEEP_SEGMENTS, SAMPLE_ONSET_CLOCK } from './data/Hypnogram';
export type { SleepStage, SleepSegment, HypnogramProps } from './data/Hypnogram';

// AI
export { InsightCard } from './ai/InsightCard';
export { ChatMessage } from './ai/ChatMessage';
export { AIGradient } from './ai/AIGradient';
export { Sparkle } from './ai/Sparkle';
export { TypeTag } from './ai/TypeTag';
export { Feedback } from './ai/Feedback';
export type { Vote } from './ai/Feedback';

// Generative-UI blocks (rendered inline in analyses / chat replies)
export * from './genui';

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
