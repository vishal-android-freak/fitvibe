import React from 'react';
import { ScoreHero as ScoreHeroBlock } from '@/components';
import { clk, fmtH, ratingHue, type NightView } from './data';

/** Sleep efficiency gauge + rating + duration and bed–wake window.
 *  (We don't get a Google "sleep score", so the gauge shows efficiency.) */
export function ScoreHero({ night }: { night: NightView }) {
  return (
    <ScoreHeroBlock
      score={night.eff}
      rating={night.rating}
      ratingHue={ratingHue(night.rating)}
      primary={fmtH(night.dur)}
      caption={`${clk(night.bed)} – ${clk(night.wake)}`}
      eyebrow="SLEEP EFFICIENCY"
      icon="moon"
    />
  );
}
