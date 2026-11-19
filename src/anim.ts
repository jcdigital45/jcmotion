import { interpolate, spring } from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// enveloppe d'entrée/sortie d'une scène (0→1→0), d = frames de transition
export const envelope = (frame: number, s: number, e: number, d = 6) =>
  clamp(Math.min((frame - (s - d)) / d, (e + d - frame) / d));

export const pop = (frame: number, fps: number, at: number, damping = 13) =>
  spring({ frame: frame - at, fps, config: { damping, stiffness: 180, mass: 0.7 } });

export const fadeOut = (frame: number, end: number, d = 5) =>
  interpolate(frame, [end - d, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// rendu d'un texte avec *accent* → segments
export const accentParts = (t: string) =>
  t.split(/(\*[^*]+\*)/g).filter(Boolean).map((p) =>
    p.startsWith('*') ? { txt: p.slice(1, -1), acc: true } : { txt: p, acc: false },
  );

export const fmtNum = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
