import {Composition} from 'remotion';
import {StartupIndiaGuide} from './StartupIndiaGuide';
import {FPS, WIDTH, HEIGHT, V_WIDTH, V_HEIGHT, TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 — landscape (YouTube, site hero) */}
      <Composition
        id="StartupIndiaGuide"
        component={StartupIndiaGuide}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {/* 9:16 — vertical (Reels, Shorts, Stories) */}
      <Composition
        id="StartupIndiaGuideVertical"
        component={StartupIndiaGuide}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={V_WIDTH}
        height={V_HEIGHT}
      />
    </>
  );
};
