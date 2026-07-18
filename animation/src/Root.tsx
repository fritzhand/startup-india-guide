import {Composition} from 'remotion';
import {StartupIndiaGuide} from './StartupIndiaGuide';
import {FPS, WIDTH, HEIGHT, TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StartupIndiaGuide"
      component={StartupIndiaGuide}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
