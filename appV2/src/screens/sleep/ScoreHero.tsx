import React from 'react';
import { ScoreHero as ScoreHeroBlock } from '@/components';
import { clk, fmtH, ratingHue, type Night } from './data';

/** Sleep score gauge + rating + duration and bed–wake window (wraps the genui block). */
export function ScoreHero({ night }: { night: Night }) {
  return (
    <ScoreHeroBlock
      score={night.score}
      rating={night.rating}
      ratingHue={ratingHue(night.rating)}
      primary={fmtH(night.dur)}
      caption={`${clk(night.bed)} – ${clk(night.wake)}`}
      eyebrow="SLEEP SCORE"
      icon="moon"
    />
  );
}
