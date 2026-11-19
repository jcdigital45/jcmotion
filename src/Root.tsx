import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { Plan } from './types';
import { dims } from './theme';

const demo: Plan = { format: '9:16', duration: 3, mode: 'voice', words: [], scenes: [] };

export const Root: React.FC = () => (
  <Composition
    id="JCMotion"
    component={Main as any}
    defaultProps={demo as any}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={90}
    calculateMetadata={({ props }) => {
      const p = props as unknown as Plan;
      const fps = p.fps ?? 30;
      return { ...dims(p.format), fps, durationInFrames: Math.max(1, Math.ceil(p.duration * fps)) };
    }}
  />
);
