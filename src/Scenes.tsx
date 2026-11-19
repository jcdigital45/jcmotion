import React from 'react';
import { AbsoluteFill, Img, Sequence, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { T, Format } from './theme';
import { Scene } from './types';
import { accentParts, clamp, fadeOut, fmtNum, pop } from './anim';
import { CardSteps, DiamondSteps, QuestionSteps, pillStyle, revealAt } from './Extras';

type P = { sc: Scene; format: Format; voiceMode: boolean };

const useLocal = (sc: Scene) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = Math.round(sc.start * fps);
  const e = Math.round(sc.end * fps);
  return { frame, fps, width, height, s, e, lf: frame - s, dur: e - s };
};

const Accent: React.FC<{ text: string; color?: string }> = ({ text, color = T.lime }) => (
  <>
    {text.split('\n').map((line, li) => (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {accentParts(line).map((p, i) => (
          <span key={i} style={{ color: p.acc ? color : undefined }}>{p.txt}</span>
        ))}
      </React.Fragment>
    ))}
  </>
);

const isMedia = (src?: string) => !!src;
const Media: React.FC<{ src: string; style?: React.CSSProperties; from?: number }> = ({ src, style, from = 0 }) =>
  /\.(mp4|mov|webm)$/i.test(src) ? (
    <Sequence from={from} layout="none">
      <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />
    </Sequence>
  ) : (
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%', ...style }} />
  );

// ---------- Mise en page commune des scènes plein écran ----------
// 9:16 : carte centrée sur fond flouté. 16:9 : carte à gauche (la face cam est à droite).
const Stage: React.FC<{ sc: Scene; format: Format; voiceMode: boolean; children: React.ReactNode; wide?: boolean }> = ({ sc, format, voiceMode, children, wide }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 14);
  const o = fadeOut(frame, e, 5);
  const split = format === '16:9' && !voiceMode;
  const box: React.CSSProperties =
    format === '9:16'
      ? { left: 70, right: 70, top: height * 0.12, bottom: height * 0.24 }
      : split
      ? { left: width * 0.05, width: width * 0.53, top: height * 0.1, bottom: height * 0.2 }
      : { left: width * (wide ? 0.12 : 0.2), right: width * (wide ? 0.12 : 0.2), top: height * 0.1, bottom: height * 0.2 };
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: 'absolute', ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          transform: `translateY(${(1 - p) * 90}px) scale(${0.93 + 0.07 * p})`, opacity: clamp(p * 1.6),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const surf = (): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${T.surface2}, ${T.surface})`, border: `1.5px solid ${T.border}`, borderRadius: 28,
  boxShadow: T.light ? '0 24px 60px rgba(20,30,80,0.18)' : '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4)', overflow: 'hidden', width: '100%',
});

const Tag: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ alignSelf: 'flex-start', background: T.lime, color: T.onAccent, fontFamily: T.ui, fontWeight: 700, fontSize: 28, padding: '8px 20px', borderRadius: 999, marginBottom: 18 }}>
    {text}
  </div>
);

const MacBar: React.FC<{ title?: string }> = ({ title }) => (
  <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
    {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{ width: 15, height: 15, borderRadius: 99, background: c }} />)}
    <div style={{ flex: 1, textAlign: 'center', color: T.muted, fontFamily: T.ui, fontSize: 20, marginRight: 60 }}>{title}</div>
  </div>
);

// ---------- CARD ----------
export const CardScene: React.FC<P> = ({ sc, format, voiceMode }) => {
  const { lf, fps, frame, s } = useLocal(sc);
  const big = format === '9:16';
  const win = sc.window ?? (sc.src ? 'mac' : 'plain');
  const items = sc.items ?? [];
  if (win === 'phone') {
    return (
      <Stage sc={sc} format={format} voiceMode={voiceMode}>
        {sc.title && <div style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 64 : 48, color: T.text, letterSpacing: '-0.03em', marginBottom: 30, textAlign: 'center' }}><Accent text={sc.title} /></div>}
        <div style={{ height: '82%', aspectRatio: '9 / 19', borderRadius: 64, border: '10px solid #2A2D29', background: '#000', overflow: 'hidden', position: 'relative', boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 80px ${T.limeGlow}` }}>
          {sc.src ? <Media src={sc.src} from={Math.round(sc.start * 30)} /> : <PhoneContent sc={sc} lf={lf} fps={fps} />}
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: '32%', height: 34, borderRadius: 99, background: '#000' }} />
        </div>
      </Stage>
    );
  }
  return (
    <Stage sc={sc} format={format} voiceMode={voiceMode}>
      <div style={surf()}>
        {win === 'mac' && <MacBar title={sc.label ?? sc.title} />}
        {isMedia(sc.src) && (
          <div style={{ width: '100%', aspectRatio: '16 / 10', position: 'relative' }}>
            <Media src={sc.src!} from={Math.round(sc.start * 30)} />
          </div>
        )}
        {(!sc.src || sc.subtitle || items.length > 0 || sc.price) && (
          <div style={{ padding: big ? 56 : 36, display: 'flex', flexDirection: 'column' }}>
            {sc.tag && <Tag text={sc.tag} />}
            {sc.title && !(win === 'mac' && sc.src && !sc.label) && (
              <div style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 76 : 46, color: T.text, letterSpacing: '-0.035em', lineHeight: 1.05 }}>
                <Accent text={sc.title} />
              </div>
            )}
            {sc.subtitle && <div style={{ fontFamily: T.ui, fontSize: big ? 38 : 26, color: T.muted, marginTop: 16, lineHeight: 1.35 }}>{sc.subtitle}</div>}
            {sc.price && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 26 }}>
                {sc.prefix && <span style={{ fontFamily: T.ui, color: T.muted, fontSize: 30 }}>{sc.prefix}</span>}
                <span style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 150 : 84, color: T.text, letterSpacing: '-0.04em' }}>{sc.price}</span>
                {sc.unit && <span style={{ fontFamily: T.ui, color: T.lime, fontWeight: 700, fontSize: 34 }}>{sc.unit}</span>}
              </div>
            )}
            {items.length > 0 && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {items.map((it, i) => {
                  const p = pop(frame, fps, s + 8 + i * 5, 15);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateX(${(1 - p) * 30}px)` }}>
                      <div style={{ width: 12, height: 12, borderRadius: 99, background: T.lime, boxShadow: `0 0 14px ${T.lime}` }} />
                      <span style={{ fontFamily: T.ui, fontSize: big ? 36 : 28, color: T.text }}>{it}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Stage>
  );
};

const PhoneContent: React.FC<{ sc: Scene; lf: number; fps: number }> = ({ sc, lf, fps }) => (
  <div style={{ padding: '80px 28px', display: 'flex', flexDirection: 'column', gap: 18, background: T.bg, height: '100%' }}>
    {sc.tag && <Tag text={sc.tag} />}
    {sc.subtitle && <div style={{ fontFamily: T.ui, fontSize: 28, color: T.muted }}>{sc.subtitle}</div>}
    {(sc.items ?? []).map((it, i) => {
      const p = pop(lf, fps, 6 + i * 5, 15);
      return (
        <div key={i} style={{ ...surf(), borderRadius: 20, padding: '20px 22px', fontFamily: T.ui, fontSize: 28, color: T.text, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
          {it}
        </div>
      );
    })}
  </div>
);

// ---------- STEPS / CHECKLIST ----------
export const StepsScene: React.FC<P & { check?: boolean }> = ({ sc, format, voiceMode, check }) => {
  const { frame, fps } = useLocal(sc);
  const big = format === '9:16';
  const items = sc.items ?? [];
  const variant = check ? 'list' : sc.style ?? T.stepStyle;
  if (variant !== 'list') {
    return (
      <Stage sc={sc} format={format} voiceMode={voiceMode}>
        {sc.label && <div style={{ alignSelf: 'flex-start', fontFamily: T.ui, fontWeight: 600, fontSize: big ? 26 : 22, letterSpacing: '0.14em', color: T.muted, textTransform: 'uppercase', marginBottom: 26 }}>{sc.label}</div>}
        {variant === 'diamonds' && <DiamondSteps sc={sc} big={big} />}
        {variant === 'questions' && <QuestionSteps sc={sc} big={big} />}
        {variant === 'cards' && <CardSteps sc={sc} big={big} />}
      </Stage>
    );
  }
  return (
    <Stage sc={sc} format={format} voiceMode={voiceMode}>
      <div style={{ width: '100%' }}>
        {sc.label && <div style={{ fontFamily: T.ui, fontWeight: 600, fontSize: big ? 26 : 22, letterSpacing: '0.14em', color: T.muted, textTransform: 'uppercase', marginBottom: 22 }}>{sc.label}</div>}
        {sc.title && <div style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 70 : 52, letterSpacing: '-0.035em', color: T.text, marginBottom: 30, lineHeight: 1.05 }}><Accent text={sc.title} /></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: big ? 20 : 16 }}>
          {items.map((it, i) => {
            const at = revealAt(sc, i, items.length, fps);
            const p = pop(frame, fps, at, 14);
            const done = check ? pop(frame, fps, at + 6, 12) : 1;
            return (
              <div key={i} style={{ ...surf(), borderRadius: 18, display: 'flex', alignItems: 'center', gap: 22, padding: big ? '26px 28px' : '20px 24px', opacity: clamp(p * 1.5), transform: `translateY(${(1 - p) * 40}px) scale(${0.96 + 0.04 * p})` }}>
                {check ? (
                  <div style={{ width: big ? 50 : 40, height: big ? 50 : 40, borderRadius: 99, border: `3px solid ${T.lime}`, background: done > 0.5 ? T.lime : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.7 + 0.3 * done})` }}>
                    <span style={{ color: T.onAccent, fontWeight: 900, fontSize: big ? 30 : 24, fontFamily: T.ui, opacity: done }}>✓</span>
                  </div>
                ) : (
                  <div style={{ minWidth: big ? 54 : 44, height: big ? 54 : 44, borderRadius: 12, background: T.lime, color: T.onAccent, fontFamily: T.ui, fontWeight: 800, fontSize: big ? 32 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                )}
                <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: big ? 42 : 34, color: T.text, letterSpacing: '-0.01em' }}>{it}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

// ---------- IMAGE / B-ROLL ----------
export const ImageScene: React.FC<P> = ({ sc, format, voiceMode }) => {
  const { frame, s, e } = useLocal(sc);
  const zoom = interpolate(frame, [s, e], [1, 1.06]);
  const win = sc.window ?? 'mac';
  if (win === 'plain' && format === '9:16') {
    // B-roll plein écran
    const o = fadeOut(frame, e, 4);
    return <AbsoluteFill style={{ opacity: o, transform: `scale(${zoom})` }}>{sc.src && <Media src={sc.src} from={Math.round(sc.start * 30)} />}</AbsoluteFill>;
  }
  if (win === 'phone') return <CardScene sc={{ ...sc, window: 'phone' }} format={format} voiceMode={voiceMode} />;
  return (
    <Stage sc={sc} format={format} voiceMode={voiceMode} wide>
      {sc.title && <div style={{ fontFamily: T.ui, fontWeight: 800, fontSize: format === '9:16' ? 62 : 44, color: T.text, letterSpacing: '-0.03em', marginBottom: 26, textAlign: 'center' }}><Accent text={sc.title} /></div>}
      <div style={surf()}>
        <MacBar title={sc.label} />
        <div style={{ width: '100%', aspectRatio: format === '9:16' ? '4 / 5' : '16 / 10', overflow: 'hidden' }}>
          {sc.src && <Media src={sc.src} from={Math.round(sc.start * 30)} style={{ transform: `scale(${zoom})` }} />}
        </div>
      </div>
      {sc.tag && <div style={{ marginTop: 22 }}><Tag text={sc.tag} /></div>}
    </Stage>
  );
};

// ---------- BIG WORD ----------
export const BigWordScene: React.FC<P> = ({ sc }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 10);
  const text = (sc.text ?? '').toUpperCase();
  const lines = text.split('\\n').join('\n').split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = Math.min((width * 0.9) / (longest * 0.47), (height * 0.62) / (lines.length * 1.02), width > height ? 300 : 360);
  const bg = sc.bg ?? 'black';
  const color = bg === 'lime' ? T.onAccent : T.text;
  if (sc.style === 'pill') {
    const pp = pop(frame, fps, s, 12);
    return (
      <AbsoluteFill style={{ background: T.bg, alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, e, 3) }}>
        <div style={{ position: 'absolute', width: width, height: width, borderRadius: 9999, background: `radial-gradient(circle, ${T.limeGlow}, transparent 60%)`, opacity: 0.6 }} />
        <div style={{ ...pillStyle(true), borderRadius: 999, padding: '28px 70px', transform: `scale(${pp})`, fontFamily: T.title, fontWeight: 800, fontSize: Math.min(width * 0.1, 150), letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          <Accent text={sc.text ?? ''} color={T.pill === 'gloss' ? '#fff' : T.lime} />
        </div>
      </AbsoluteFill>
    );
  }
  const shake = frame - s < 6 ? Math.sin((frame - s) * 2.6) * (6 - (frame - s)) * 2 : 0;
  return (
    <AbsoluteFill style={{ background: bg === 'lime' ? T.lime : bg === 'black' ? T.bg : 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, e, 3) }}>
      {bg === 'black' && <div style={{ position: 'absolute', width: width * 0.9, height: width * 0.9, borderRadius: 9999, background: `radial-gradient(circle, ${T.limeGlow}, transparent 65%)`, opacity: 0.45 }} />}
      <div style={{ fontFamily: T.display, fontSize: fs, lineHeight: 1.0, color, textAlign: 'center', transform: `scale(${1.35 - 0.35 * p}) translateX(${shake}px)`, letterSpacing: '0.005em', textShadow: T.glow && bg !== 'lime' ? `0 0 40px ${T.limeGlow}` : undefined }}>
        {lines.map((l, i) => (
          <div key={i}><Accent text={l} color={bg === 'lime' ? T.text : T.lime} /></div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- COUNTER ----------
export const CounterScene: React.FC<P> = ({ sc }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 16);
  const k = interpolate(frame, [s, s + Math.min(28, (e - s) * 0.7)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) });
  const v = (sc.value ?? 0) * k;
  const vert = height > width;
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, e, 4) }}>
      <div style={{ position: 'absolute', width: width, height: width, borderRadius: 9999, background: `radial-gradient(circle, ${T.limeGlow}, transparent 60%)`, opacity: 0.5 }} />
      <div style={{ transform: `scale(${0.85 + 0.15 * p})`, textAlign: 'center' }}>
        <div style={{ fontFamily: T.display, fontSize: vert ? 230 : 250, color: T.lime, lineHeight: 1 }}>{sc.prefix ?? ''}{fmtNum(v)}{sc.suffix ?? ''}</div>
        {sc.text && <div style={{ fontFamily: T.display, fontSize: vert ? 96 : 90, color: T.text, marginTop: 10 }}>{sc.text.toUpperCase()}</div>}
        {sc.tag && <div style={{ display: 'inline-block', marginTop: 28, background: T.lime, color: T.onAccent, fontFamily: T.ui, fontWeight: 800, fontSize: 36, padding: '10px 26px', borderRadius: 999 }}>{sc.tag}</div>}
      </div>
    </AbsoluteFill>
  );
};

// ---------- FLASH ----------
export const FlashScene: React.FC<P> = ({ sc }) => {
  const { frame, s, e } = useLocal(sc);
  const o = interpolate(frame, [s, e], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: sc.color ?? T.lime, opacity: o }} />;
};

// ---------- CTA ----------
export const CtaScene: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 14);
  const b = pop(frame, fps, s + 10, 10);
  const pulse = 1 + Math.sin((frame - s) / 6) * 0.025;
  const big = format === '9:16';
  return (
    <AbsoluteFill style={{ background: T.bg, alignItems: 'center', justifyContent: 'center', opacity: fadeOut(frame, e, 6) }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, ${T.limeGlow}, transparent 55%)`, opacity: 0.6 }} />
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - p) * 60}px)`, opacity: p, padding: 60 }}>
        <div style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 92 : 84, color: T.text, letterSpacing: '-0.04em', lineHeight: 1.05 }}><Accent text={sc.title ?? ''} /></div>
        {sc.button && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, marginTop: 50, background: T.lime, color: T.onAccent, fontFamily: T.ui, fontWeight: 800, fontSize: big ? 48 : 42, padding: '24px 46px', borderRadius: 999, transform: `scale(${b * pulse})`, boxShadow: `0 0 60px ${T.limeGlow}` }}>
            {sc.button} <span style={{ fontSize: big ? 52 : 44 }}>→</span>
          </div>
        )}
        {sc.subtitle && <div style={{ fontFamily: T.ui, fontSize: big ? 34 : 30, color: T.muted, marginTop: 34 }}>{sc.subtitle}</div>}
      </div>
    </AbsoluteFill>
  );
};

// ---------- OVERLAYS (face cam visible) ----------
export const HookOverlay: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 14);
  const o = fadeOut(frame, e, 5);
  const big = format === '9:16';
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * (big ? 0.42 : 0.5), background: 'linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0))' }} />
      <div style={{ position: 'absolute', left: big ? 70 : width * 0.06, right: big ? 70 : width * 0.4, top: big ? height * 0.13 : height * 0.12, textAlign: big ? 'center' : 'left', fontFamily: T.ui, fontWeight: 800, fontSize: big ? 86 : 78, letterSpacing: '-0.045em', lineHeight: 1.02, color: T.text, transform: `translateY(${(1 - p) * -40}px)`, opacity: p, textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
        <Accent text={sc.title ?? sc.text ?? ''} />
      </div>
    </AbsoluteFill>
  );
};

export const ChipsOverlay: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const o = fadeOut(frame, e, 5);
  const big = format === '9:16';
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: 'absolute', left: big ? 60 : width * 0.04, top: big ? height * 0.14 : height * 0.08, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        {(sc.items ?? []).map((it, i) => {
          const p = pop(frame, fps, s + i * 6, 12);
          return (
            <div key={i} style={{ ...pillStyle(big), display: 'flex', alignItems: 'center', gap: 14, borderRadius: 999, padding: big ? '14px 28px 14px 16px' : '10px 22px 10px 12px', transform: `scale(${p}) translateX(${(1 - p) * -40}px)`, transformOrigin: 'left center', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              <div style={{ width: big ? 40 : 32, height: big ? 40 : 32, borderRadius: 99, background: T.pill === 'gloss' ? '#fff' : T.lime, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.onAccent, fontWeight: 900, fontFamily: T.ui, fontSize: big ? 22 : 18 }}>{i + 1}</div>
              <span style={{ fontFamily: T.title, fontWeight: 700, fontSize: big ? 40 : 32 }}>{it}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const StepperOverlay: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 14);
  const big = format === '9:16';
  const items = sc.items ?? [];
  const active = sc.active ?? items.length - 1;
  return (
    <AbsoluteFill style={{ opacity: fadeOut(frame, e, 5) }}>
      <div style={{ position: 'absolute', top: big ? height * 0.14 : height * 0.1, left: 40, right: 40, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - p) * -30}px)`, opacity: p }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(15,16,14,0.9)', border: `1.5px solid ${T.border}`, borderRadius: 999, padding: big ? '16px 26px' : '12px 22px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {items.map((it, i) => {
            const done = i < active || (i === active && frame - s > 12);
            const cur = i === active;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: big ? 30 : 40, height: 2, background: i <= active ? T.lime : T.border }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i <= active ? 1 : 0.5 }}>
                  <div style={{ width: big ? 34 : 28, height: big ? 34 : 28, borderRadius: 99, border: `2.5px solid ${done ? T.lime : T.muted}`, background: done ? T.lime : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.onAccent, fontSize: big ? 20 : 16, fontWeight: 900, transform: cur ? `scale(${1 + 0.15 * Math.max(0, Math.sin((frame - s) / 5))})` : undefined }}>{done ? '✓' : ''}</div>
                  <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: big ? 30 : 26, color: T.text }}>{it}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const BadgeOverlay: React.FC<P> = ({ sc, format }) => {
  const { frame, fps, width, height, s, e } = useLocal(sc);
  const p = pop(frame, fps, s, 12);
  const big = format === '9:16';
  return (
    <AbsoluteFill style={{ opacity: fadeOut(frame, e, 5) }}>
      <div style={{ position: 'absolute', top: big ? height * 0.085 : height * 0.06, left: 0, right: 0, display: 'flex', justifyContent: big ? 'center' : 'flex-end', paddingRight: big ? 0 : width * 0.04 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0E0F0D', border: `1.5px solid ${T.border}`, borderRadius: 999, padding: '10px 24px 10px 10px', transform: `scale(${p})` }}>
          <div style={{ background: T.lime, color: T.onAccent, borderRadius: 999, padding: '6px 16px', fontFamily: T.ui, fontWeight: 800, fontSize: big ? 28 : 24 }}>{sc.tag ?? sc.label}</div>
          <span style={{ fontFamily: T.ui, fontWeight: 600, fontSize: big ? 32 : 28, color: T.text }}>{sc.text}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const FULLSCREEN = ['card', 'steps', 'checklist', 'image', 'bigword', 'counter', 'cta'];
export const OPAQUE = ['bigword', 'counter', 'cta'];
