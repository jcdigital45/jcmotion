import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { T, Format } from './theme';
import { Word, Scene } from './types';
import { pop } from './anim';

type Group = { words: Word[]; s: number; e: number };

const isBreak = (w: string) => /[.,!?;:…]$/.test(w.trim());

export const groupWords = (words: Word[], format: Format): Group[] => {
  const maxWords = format === '9:16' ? 3 : 7;
  const maxChars = format === '9:16' ? 16 : 44;
  const groups: Group[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) groups.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e });
    cur = [];
  };
  words.forEach((w, i) => {
    const len = cur.map((x) => x.w).join(' ').length + w.w.length;
    const gap = cur.length ? w.s - cur[cur.length - 1].e : 0;
    if (cur.length && (cur.length >= maxWords || len > maxChars || gap > 0.6)) flush();
    cur.push(w);
    if (isBreak(w.w)) flush();
  });
  flush();
  // chaque groupe reste affiché jusqu'au suivant (max +0.5 s après la fin)
  groups.forEach((g, i) => {
    const next = groups[i + 1];
    g.e = next ? Math.min(next.s, g.e + 0.5) : g.e + 0.6;
  });
  return groups;
};

const HIDE = ['bigword', 'counter', 'flash', 'cta', 'process'];
const FULL = ['card', 'steps', 'checklist', 'image', 'frame'];

export const Captions: React.FC<{
  words: Word[];
  scenes: Scene[];
  format: Format;
  voiceMode: boolean;
}> = ({ words, scenes, format, voiceMode }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const groups = React.useMemo(() => groupWords(words, format), [words, format]);
  const g = groups.find((x) => t >= x.s - 0.03 && t < x.e);
  if (!g) return null;
  const active = scenes.filter((s) => t >= s.start && t < s.end);
  if (active.some((s) => HIDE.includes(s.type))) return null;
  const overFull = active.some((s) => FULL.includes(s.type));
  const hasHook = active.some((s) => s.type === 'hook');
  const darkText = T.light && voiceMode;

  if (format === '9:16') {
    const p = pop(frame, fps, Math.round(g.s * fps), 12);
    const small = overFull;
    const size = small ? 68 : 112;
    const top = small ? height * 0.84 : voiceMode ? height * 0.46 : hasHook ? height * 0.66 : height * 0.6;
    return (
      <div
        style={{
          position: 'absolute', left: 60, right: 60, top, transform: `translateY(-50%) scale(${0.82 + 0.18 * p})`,
          textAlign: 'center', fontFamily: T.ui, fontWeight: 800, fontSize: size, lineHeight: 1.0,
          letterSpacing: '-0.045em', color: darkText ? T.text : '#FFFFFF',
          textShadow: darkText ? 'none' : '0 6px 28px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {g.words.filter((w) => t >= w.s - 0.02).map((w, i, arr) => {
          const wp = pop(frame, fps, Math.round(w.s * fps), 11);
          return (
            <span key={i} style={{ color: w.k ? (T.light && !darkText ? T.accent2 : T.lime) : darkText ? T.text : '#FFFFFF', marginRight: i < arr.length - 1 ? '0.22em' : 0, display: 'inline-block', transform: `scale(${0.7 + 0.3 * wp})` }}>
              {w.w.replace(/^\s+/, '')}
            </span>
          );
        })}
      </div>
    );
  }

  // 16:9 — ligne en bas, mot-clé vert citron
  const p = pop(frame, fps, Math.round(g.s * fps), 16);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: height * 0.07, display: 'flex', justifyContent: 'center', opacity: p }}>
      <div
        style={{
          fontFamily: T.ui, fontWeight: 600, fontSize: 44, color: '#FFFFFF', padding: '10px 22px', borderRadius: 12,
          background: overFull && !active.some((s) => s.type === 'frame') ? 'transparent' : 'rgba(0,0,0,0.55)', maxWidth: width * 0.8, textAlign: 'center',
          letterSpacing: '-0.01em', textShadow: '0 2px 10px rgba(0,0,0,0.6)',
        }}
      >
        {g.words.map((w, i) => (
          <span key={i} style={{ color: w.k ? (T.light ? T.accent2 : T.lime) : '#FFFFFF', opacity: t >= w.s - 0.02 ? 1 : 0.42 }}>
            {w.w.replace(/^\s+/, '')}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};
