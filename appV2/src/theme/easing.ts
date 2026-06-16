import { Easing } from 'react-native-reanimated';
import { motion } from './tokens';

/** Reanimated easing functions built from the FitVibe motion bezier tokens. */
export const easeOut = Easing.bezier(...motion.easeOut);
export const easeInOut = Easing.bezier(...motion.easeInOut);
export const easeSpring = Easing.bezier(...motion.easeSpring);
