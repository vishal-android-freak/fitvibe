import React from 'react';
import { ScoreHero as ScoreHeroBlock } from '@/components';
import { clk, fmtH, scoreBandHue, type NightView } from './data';

/** Sleep-score gauge (0-100) + band + duration and bed–wake window. The score
 *  is FitVibe's own, calibrated to Google's and banded on the same scale. */
export function ScoreHero({ night }: { night: NightView }) {
  const { score, scoreBand } = night.raw;
  return (
    <ScoreHeroBlock
      score={score}
      rating={scoreBand.label}
      ratingHue={scoreBandHue(scoreBand.label)}
      primary={fmtH(night.dur)}
      caption={`${clk(night.bed)} – ${clk(night.wake)}`}
      eyebrow="SLEEP SCORE"
      icon="moon"
    />
  );
}
