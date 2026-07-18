import React from 'react';
import {AbsoluteFill, Audio, Series, staticFile} from 'remotion';
import {SCENES} from './timeline';
import {SOUNDTRACK} from './audio-file';
import {bodyFont} from './fonts';
import {IntroScene} from './scenes/IntroScene';
import {ProblemScene} from './scenes/ProblemScene';
import {StatsScene} from './scenes/StatsScene';
import {LifecycleScene} from './scenes/LifecycleScene';
import {FinderScene} from './scenes/FinderScene';
import {OutroScene} from './scenes/OutroScene';

const SCENE_COMPONENT: Record<string, React.FC> = {
  intro: IntroScene,
  problem: ProblemScene,
  stats: StatsScene,
  lifecycle: LifecycleScene,
  finder: FinderScene,
  outro: OutroScene,
};

export const StartupIndiaGuide: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#0f1d31', fontFamily: bodyFont}}>
      <Series>
        {SCENES.map((scene) => {
          const Comp = SCENE_COMPONENT[scene.name];
          return (
            <Series.Sequence
              key={scene.name}
              durationInFrames={scene.durationInFrames}
              // small overlap so scene entrances kiss the previous frame,
              // hiding the cut under the audio whoosh without shifting timing
              offset={0}
            >
              <Comp />
            </Series.Sequence>
          );
        })}
      </Series>

      <Audio src={staticFile(SOUNDTRACK)} volume={0.95} />
    </AbsoluteFill>
  );
};
