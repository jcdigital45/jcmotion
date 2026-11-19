import { Format } from './theme';

export type Word = { w: string; s: number; e: number; k?: boolean };

export type Scene = {
  type:
    | 'hook'
    | 'bigword'
    | 'card'
    | 'steps'
    | 'checklist'
    | 'chips'
    | 'stepper'
    | 'badge'
    | 'counter'
    | 'flash'
    | 'image'
    | 'cta'
    | 'overlay'
    | 'frame'
    | 'process';
  start: number; // secondes
  end: number;
  // champs libres selon le type
  text?: string;
  title?: string;
  subtitle?: string;
  label?: string;
  tag?: string;
  items?: string[];
  active?: number;
  value?: number;
  suffix?: string;
  prefix?: string;
  unit?: string;
  price?: string;
  src?: string;
  window?: 'mac' | 'phone' | 'plain';
  bg?: 'black' | 'lime' | 'face';
  color?: string;
  button?: string;
  style?: string; // variante (steps : list|diamonds|questions|cards ; bigword : pill)
  times?: number[];
  // overlay / frame (bibliothèque) — file/mode/hole injectés par render.py
  clip?: string;
  file?: string;
  mode?: 'screen' | 'chroma' | 'full';
  hole?: number[];
  pos?: string;
  size?: number;
  x?: number;
  y?: number;
  sound?: boolean;
  opacity?: number;
  // process
  from?: string;
  to?: string;
  center?: string;
};

export type Plan = {
  format: Format;
  theme?: string;
  bgFile?: string;
  bgDuration?: number;
  fps?: number;
  duration: number;
  mode: 'facecam' | 'voice';
  video?: string; // fichier dans public/
  audio?: string; // mode voix
  music?: string;
  musicVolume?: number;
  sfx?: boolean;
  sfxVolume?: number;
  brand?: string;
  progressBar?: boolean;
  words: Word[];
  scenes: Scene[];
};
