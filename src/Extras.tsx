import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, Format } from './theme';
import { Scene } from './types';
import { accentParts, clamp, fadeOut, pop } from './anim';

type P = { sc: Scene; format: Format; voiceMode: boolean; sfxVol?: number };

const Accent: React.FC<{ text: string; color?: string }> = ({ text, color }) => (
  <>
    {text.split('\n').map((line, li) => (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {accentParts(line).map((p, i) => (
          <span key={i} style={{ color: p.acc ? color ?? T.lime : undefined }}>{p.txt}</span>
        ))}
      </React.Fragment>
    ))}
  </>
);

const useS = (sc: Scene) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return { frame, fps, width, height, s: Math.round(sc.start * fps), e: Math.round(sc.end * fps) };
};

// ---------- Clip de la bibliothèque (effet, annotation, logo, fond vert…) ----------
const POS: Record<string, [number, number]> = {
  center: [0.5, 0.5], top: [0.5, 0.2], bottom: [0.5, 0.8], left: [0.25, 0.5], right: [0.75, 0.5],
  topleft: [0.22, 0.2], topright: [0.78, 0.2], bottomleft: [0.22, 0.8], bottomright: [0.78, 0.8], caption: [0.5, 0.68],
};

export const isCover = (sc: Scene) =>
  (sc.type === 'overlay' && sc.mode === 'full' && (sc.pos ?? 'full') === 'full') || sc.type === 'frame';

export const LibClip: React.FC<{ sc: Scene; sfxVol: number; style?: React.CSSProperties }> = ({ sc, sfxVol, style }) => {
  const { s } = useS(sc);
  if (!sc.file) return null;
  const isWebm = sc.file.endsWith('.webm');
  return (
    <Sequence from={s} layout="none">
      <OffthreadVideo
        src={staticFile('lib/' + sc.file)}
        transparent={isWebm}
        volume={sc.sound ? sfxVol : 0}
        muted={!sc.sound}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      />
    </Sequence>
  );
};

export const OverlayScene: React.FC<P> = ({ sc, format, sfxVol = 0.4 }) => {
  const { frame, width, height, s, e } = useS(sc);
  const o = Math.min(fadeOut(frame, e, 4), interpolate(frame, [s, s + 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) * (sc.opacity ?? 1);
  const blend: React.CSSProperties['mixBlendMode'] = sc.mode === 'screen' ? 'screen' : 'normal';
  const pos = sc.pos ?? (sc.mode === 'full' || sc.mode === 'screen' ? 'full' : 'center');
  if (pos === 'full') {
    return (
      <AbsoluteFill style={{ opacity: o, mixBlendMode: blend }}>
        <LibClip sc={sc} sfxVol={sfxVol} />
      </AbsoluteFill>
    );
  }
  const [cx, cy] = sc.x != null && sc.y != null ? [sc.x, sc.y] : pos === 'caption' ? [0.5, format === '9:16' ? 0.66 : 0.97] : POS[pos] ?? POS.center;
  const w = width * (sc.size ?? (format === '9:16' ? 0.6 : 0.35));
  return (
    <AbsoluteFill style={{ opacity: o, mixBlendMode: blend }}>
      <div style={{ position: 'absolute', left: cx * width - w / 2, top: cy * height - w * 0.5625 / 2, width: w, height: w * 0.5625 }}>
        <LibClip sc={sc} sfxVol={sfxVol} style={{ objectFit: 'contain' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- Cadre à remplir (ordinateur, page YouTube…) avec la capture de l'utilisateur ----------
export const FrameScene: React.FC<P> = ({ sc, format, sfxVol = 0.4 }) => {
  const { frame, width, height, s, e } = useS(sc);
  const p = pop(frame, 30, s, 16);
  const [hx0, hy0, hw0, hh0] = sc.hole ?? [0.1, 0.1, 0.8, 0.8];
  const pad = 0.012; const hx = hx0 - pad, hy = hy0 - pad, hw = hw0 + 2 * pad, hh = hh0 + 2 * pad;
  // le clip source est 16:9 : on le place en « contain » dans le format cible
  // 9:16 : on zoome sur la zone à remplir ; 16:9 : on réduit le cadre pour laisser la place au titre
  const k = format === '9:16' ? Math.min(1.8, Math.max(1, 0.8 / hw)) : sc.title ? 0.8 : 1;
  const cw = width * k, ch = width * k * 0.5625;
  const left = format === '9:16' ? width / 2 - (hx + hw / 2) * cw : (width - cw) / 2;
  const top = format === '9:16' ? height * 0.52 - (hy + hh / 2) * ch : sc.title ? height * 0.15 : (height - ch) / 2;
  const isVid = sc.src && /\.(mp4|mov|webm)$/i.test(sc.src);
  return (
    <AbsoluteFill style={{ background: T.bg, opacity: fadeOut(frame, e, 5) }}>
      <div style={{ position: 'absolute', left, top, width: cw, height: ch, transform: `scale(${0.94 + 0.06 * p})` }}>
        <div style={{ position: 'absolute', left: hx * cw, top: hy * ch, width: hw * cw, height: hh * ch, overflow: 'hidden', background: '#000' }}>
          {sc.src && (isVid ? (
            <Sequence from={s} layout="none"><OffthreadVideo src={staticFile(sc.src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Sequence>
          ) : (
            <Img src={staticFile(sc.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }} />
          ))}
        </div>
        <AbsoluteFill><LibClip sc={sc} sfxVol={sfxVol} /></AbsoluteFill>
      </div>
      {sc.title && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: format === '9:16' ? height * 0.14 : height * 0.04, textAlign: 'center', fontFamily: T.title, fontWeight: 800, fontSize: format === '9:16' ? 70 : 56, color: T.text, letterSpacing: '-0.02em', opacity: p }}>
          <Accent text={sc.title} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- Schéma de process : départ → (cercle) → arrivée ----------
export const ProcessScene: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, width, height, s, e } = useS(sc);
  const vert = format === '9:16';
  const pc = pop(frame, fps, s + 4, 12);
  const pl = pop(frame, fps, s + 10, 14);
  const arrow = interpolate(frame, [s + 14, s + 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pr = pop(frame, fps, s + 30, 14);
  const ps = pop(frame, fps, s + 22, 16);
  const cx = width / 2, cy = height * (vert ? 0.42 : 0.42);
  const R = vert ? 170 : 150;
  const lx = vert ? width * 0.2 : width * 0.2, rx = vert ? width * 0.8 : width * 0.8;
  const ly = cy - R * (vert ? 1.6 : 1.1);
  const path = `M ${lx + 40} ${ly + 30} Q ${cx} ${ly - R * 1.2} ${rx - 40} ${ly + 30}`;
  const isImg = sc.center && /\.(png|jpe?g|webp)$/i.test(sc.center);
  const label = (txt: string | undefined, x: number, p: number) => txt ? (
    <div style={{ position: 'absolute', left: x - 260, width: 520, top: ly + 50, textAlign: 'center', transform: `translateY(${(1 - p) * 30}px)`, opacity: p }}>
      <div style={{ fontFamily: T.title, fontWeight: 700, fontSize: vert ? 46 : 40, color: T.text }}>{txt}</div>
      <div style={{ margin: '8px auto 0', width: 90 * p, height: 5, borderRadius: 3, background: T.lime }} />
    </div>
  ) : null;
  return (
    <AbsoluteFill style={{ background: T.bg, opacity: fadeOut(frame, e, 5) }}>
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        <path d={`M 0 ${height * 0.62} Q ${width / 2} ${height * 0.42} ${width} ${height * 0.62} L ${width} ${height} L 0 ${height} Z`} fill={T.limeDeep} opacity={0.9} />
        <path d={path} fill="none" stroke={T.text} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrow} />
        {arrow > 0.98 && <polygon points={`${rx - 40},${ly + 30} ${rx - 70},${ly + 14} ${rx - 58},${ly + 44}`} fill={T.text} />}
      </svg>
      {label(sc.from, lx, pl)}
      {label(sc.to, rx, pr)}
      <div style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, borderRadius: 999, background: T.accent2, border: `10px solid ${T.light ? '#fff' : T.surface2}`, boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 60px ${T.limeGlow}`, transform: `scale(${pc})`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isImg ? <Img src={staticFile(sc.center!)} style={{ width: '80%', height: '80%', objectFit: 'contain' }} /> : (
          <span style={{ fontFamily: T.display, fontSize: R * 0.55, color: T.onAccent, textAlign: 'center', lineHeight: 1 }}>{sc.center}</span>
        )}
      </div>
      {sc.subtitle && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: cy + R + (vert ? 160 : 70), textAlign: 'center', fontFamily: T.title, fontWeight: 600, fontSize: vert ? 46 : 38, color: '#fff', opacity: ps, transform: `translateY(${(1 - ps) * 20}px)` }}>
          <Accent text={sc.subtitle} color={T.accent2} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- Variantes de listes (losanges bleus, questions rouges, cartes violettes) ----------
export const revealAt = (sc: Scene, i: number, n: number, fps: number) => {
  if (sc.times && sc.times[i] != null) return Math.round(sc.times[i] * fps);
  const span = (sc.end - sc.start) * 0.65;
  return Math.round((sc.start + 0.15 + (span * i) / Math.max(1, n)) * fps);
};

export const DiamondSteps: React.FC<{ sc: Scene; big: boolean }> = ({ sc, big }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = sc.items ?? [];
  const n = items.length;
  const D = big ? 96 : 84;
  const line = interpolate(frame, [Math.round(sc.start * fps), revealAt(sc, n - 1, n, fps) + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const diamond = (i: number) => {
    const p = pop(frame, fps, revealAt(sc, i, n, fps), 11);
    return (
      <div style={{ width: D, height: D, transform: `rotate(45deg) scale(${p})`, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent2}, ${T.limeDeep})`, boxShadow: `0 0 30px ${T.limeGlow}, inset 0 0 0 3px rgba(255,255,255,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ transform: 'rotate(-45deg)', fontFamily: T.title, fontWeight: 800, fontSize: D * 0.42, color: '#fff' }}>{String(i + 1).padStart(2, '0')}</span>
      </div>
    );
  };
  if (big) {
    // 9:16 : losanges sur une ligne verticale, libellés à droite
    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: 54, paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 30 + D / 2 - 2, top: D / 2, width: 4, height: `calc(${line * 100}% - ${D}px)`, background: `linear-gradient(${T.lime}, ${T.accent2})`, boxShadow: `0 0 16px ${T.limeGlow}` }} />
        {items.map((it, i) => {
          const p = pop(frame, fps, revealAt(sc, i, n, fps) + 4, 14);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
              {diamond(i)}
              <div style={{ fontFamily: T.title, fontWeight: 700, fontSize: 46, color: T.text, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, padding: '12px 26px', borderRadius: 16, border: `2px solid ${T.border}`, background: T.surface }}>{it}</div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: 110 }}>
      <div style={{ position: 'absolute', left: '6%', top: 110 + D / 2, height: 4, width: `${line * 88}%`, background: `linear-gradient(90deg, ${T.lime}, ${T.accent2})`, boxShadow: `0 0 16px ${T.limeGlow}` }} />
      {items.map((it, i) => {
        const p = pop(frame, fps, revealAt(sc, i, n, fps) + 4, 14);
        return (
          <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'absolute', bottom: D + 40, whiteSpace: 'nowrap', fontFamily: T.title, fontWeight: 600, fontSize: 38, color: T.text, opacity: p, padding: '10px 22px', borderRadius: 12, border: `2px solid ${T.border}`, background: T.surface }}>{it}</div>
            {diamond(i)}
          </div>
        );
      })}
    </div>
  );
};

export const QuestionSteps: React.FC<{ sc: Scene; big: boolean }> = ({ sc, big }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = sc.items ?? [];
  const n = items.length;
  const last = revealAt(sc, n - 1, n, fps);
  const boxP = pop(frame, fps, last + 14, 14);
  const O = big ? 76 : 62;
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {sc.title && (
        <div style={{ fontFamily: T.title, fontWeight: 800, fontSize: big ? 58 : 46, color: T.text, marginBottom: 30, opacity: boxP, transform: `scale(${0.9 + 0.1 * boxP})` }}>
          <Accent text={sc.title} color={T.text} />
        </div>
      )}
      <div style={{ padding: big ? 34 : 28, borderRadius: 26, border: `3px dashed ${boxP > 0.1 ? 'rgba(255,255,255,0.55)' : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: big ? 26 : 20, minWidth: '80%' }}>
        {items.map((it, i) => {
          const p = pop(frame, fps, revealAt(sc, i, n, fps), 13);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: clamp(p * 1.4), transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ width: O, height: O, borderRadius: 999, flexShrink: 0, background: `radial-gradient(circle at 35% 30%, ${T.accent2}, ${T.lime} 45%, ${T.limeDeep})`, boxShadow: `0 0 26px ${T.limeGlow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.title, fontWeight: 800, fontSize: O * 0.55, color: '#fff' }}>{i === 0 ? '?' : ''}</div>
              <div style={{ fontFamily: T.title, fontWeight: 700, fontSize: big ? 44 : 34, color: T.text, padding: big ? '16px 30px' : '12px 24px', borderRadius: 999, background: T.surface2, border: `1.5px solid ${T.border}` }}>{it}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CardSteps: React.FC<{ sc: Scene; big: boolean }> = ({ sc, big }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = sc.items ?? [];
  const n = items.length;
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: big ? 'column' : 'row', gap: big ? 28 : 34, justifyContent: 'center', alignItems: 'stretch' }}>
      {items.map((it, i) => {
        const p = pop(frame, fps, revealAt(sc, i, n, fps), 12);
        return (
          <div key={i} style={{ flex: 1, minHeight: big ? 0 : 340, padding: big ? '28px 34px' : '34px 30px', borderRadius: 30, background: `linear-gradient(160deg, ${T.surface2}, ${T.surface})`, border: `1.5px solid ${T.border}`, boxShadow: `0 30px 70px rgba(0,0,0,0.45), 0 0 50px ${T.limeGlow}`, display: 'flex', flexDirection: big ? 'row' : 'column', alignItems: big ? 'center' : 'flex-start', gap: big ? 30 : 20, opacity: clamp(p * 1.5), transform: `translateY(${(1 - p) * 70}px) rotate(${(1 - p) * (i % 2 ? 4 : -4)}deg)` }}>
            <div style={{ fontFamily: T.display, fontSize: big ? 110 : 120, lineHeight: 0.9, background: `linear-gradient(180deg, #fff, ${T.lime})`, WebkitBackgroundClip: 'text', color: 'transparent' }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontFamily: T.title, fontWeight: 700, fontSize: big ? 46 : 36, color: T.text, lineHeight: 1.15 }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

// Pastille stylée selon le thème (chips, badge, bouton)
export const pillStyle = (big: boolean): React.CSSProperties => {
  switch (T.pill) {
    case 'gloss':
      return { background: `linear-gradient(180deg, ${T.accent2}22, ${T.lime} 40%, ${T.limeDeep})`, border: `1.5px solid rgba(255,255,255,0.35)`, boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 30px ${T.limeGlow}, inset 0 2px 0 rgba(255,255,255,0.4)`, color: T.onAccent };
    case 'glass':
      return { background: 'rgba(255,255,255,0.12)', border: `1.5px solid rgba(255,255,255,0.3)`, backdropFilter: 'blur(18px)', boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 30px ${T.limeGlow}`, color: T.text };
    case 'neon':
      return { background: 'rgba(4,4,8,0.85)', border: `2.5px solid ${T.lime}`, boxShadow: `0 0 18px ${T.limeGlow}, inset 0 0 14px ${T.limeGlow}`, color: T.text };
    default:
      return { background: T.light ? '#fff' : 'rgba(15,16,14,0.88)', border: `1.5px solid ${T.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', color: T.text };
  }
};
