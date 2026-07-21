import React from 'react';
import {AbsoluteFill, Audio, staticFile, useVideoConfig} from 'remotion';
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {iris} from '@remotion/transitions/iris';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {sceneDuration} from './timeline';
import {SOUNDTRACK} from './audio-file';
import {bodyFont} from './fonts';
import {IntroScene} from './scenes/IntroScene';
import {ProblemScene} from './scenes/ProblemScene';
import {StatsScene} from './scenes/StatsScene';
import {LifecycleScene} from './scenes/LifecycleScene';
import {FinderScene} from './scenes/FinderScene';
import {OutroScene} from './scenes/OutroScene';

// Real overlapping transitions (not hard cuts). Each scene's raw duration is
// padded by half of each adjacent transition (see timeline.js) so every
// transition MIDPOINT lands on the frame where the soundtrack places its
// whoosh / drop / boom — audio stays perfectly in sync, WAV untouched.
export const StartupIndiaGuide: React.FC = () => {
  const {width, height} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#0f1d31', fontFamily: bodyFont}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={sceneDuration('intro')}>
          <IntroScene />
        </TransitionSeries.Sequence>

        {/* T1 — soft dissolve, carries dark → light palette flip */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: 16})}
        />

        <TransitionSeries.Sequence durationInFrames={sceneDuration('problem')}>
          <ProblemScene />
        </TransitionSeries.Sequence>

        {/* T2 — the numbers "drop" up into frame on the beat */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />

        <TransitionSeries.Sequence durationInFrames={sceneDuration('stats')}>
          <StatsScene />
        </TransitionSeries.Sequence>

        {/* T3 — timeline sweeps in left → right, like a track */}
        <TransitionSeries.Transition
          presentation={wipe({direction: 'from-left'})}
          timing={linearTiming({durationInFrames: 18})}
        />

        <TransitionSeries.Sequence durationInFrames={sceneDuration('lifecycle')}>
          <LifecycleScene />
        </TransitionSeries.Sequence>

        {/* T4 — focus "opens" onto the decision tree */}
        <TransitionSeries.Transition
          presentation={iris({width, height})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 18})}
        />

        <TransitionSeries.Sequence durationInFrames={sceneDuration('finder')}>
          <FinderScene />
        </TransitionSeries.Sequence>

        {/* T5 — radial sweep into the CTA, lands on the boom */}
        <TransitionSeries.Transition
          presentation={clockWipe({width, height})}
          timing={springTiming({config: {damping: 200}, durationInFrames: 20})}
        />

        <TransitionSeries.Sequence durationInFrames={sceneDuration('outro')}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <Audio src={staticFile(SOUNDTRACK)} volume={0.95} />
    </AbsoluteFill>
  );
};
