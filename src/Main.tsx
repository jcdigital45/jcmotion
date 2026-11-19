import React from 'react';
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/anton/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import { Loop } from 'remotion';
import { T, applyTheme } from './theme';
import { FrameScene, OverlayScene, ProcessScene, isCover } from './Extras';
import { Plan, Scene } from './types';
import { envelope } from './anim';
import { Captions } from './Captions';
import {
  BadgeOverlay, BigWordScene, CardScene, ChipsOverlay, CounterScene, CtaScene, FlashScene, FULLSCREEN,
  HookOverlay, ImageScene, OPAQUE, StepperOverlay, StepsScene,
} from './Scenes';

const isFull = (sc: Scene) => FULLSCREEN.includes(sc.type) || sc.type === 'process' || isCover(sc);
const isOpaque = (sc: Scene) => OPAQUE.includes(sc.type) || sc.type === 'process' || isCover(sc);

// Fond animé (mode voix seule et derrière les cartes)
const Backdrop: React.FC<{ file?: string; dur?: number }> = ({ file, dur }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  if (file) {
    return (
      <AbsoluteFill style={{ background: T.bg }}>
        <Loop durationInFrames={Math.max(15, Math.floor((dur ?? 5) * fps) - 2)}>
          <OffthreadVideo src={staticFile('lib/' + file)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Loop>
        <AbsoluteFill style={{ background: T.light ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} />
      </AbsoluteFill>
    );
  }
  const x = width * (0.5 + 0.25 * Math.sin(frame / 90));
  const y = height * (0.45 + 0.15 * Math.cos(frame / 110));
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <div style={{ position: 'absolute', left: x - width * 0.6, top: y - width * 0.6, width: width * 1.2, height: width * 1.2, borderRadius: 9999, background: `radial-gradient(circle, ${T.limeGlow}, transparent 60%)`, opacity: 0.5 }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${T.light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)'} 1px, transparent 1px), linear-gradient(90deg, ${T.light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)'} 1px, transparent 1px)`, backgroundSize: '72px 72px', maskImage: 'radial-gradient(circle at 50% 45%, black, transparent 75%)' }} />
    </AbsoluteFill>
  );
};

// Face cam : plein écran ↔ flouté (9:16) ↔ encadré à droite (16:9), avec zooms « jump cut »
const FaceLayer: React.FC<{ plan: Plan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const scenes = plan.scenes;
  const t = frame / fps;

  // enveloppe des scènes plein écran
  let full = 0;
  let opaque = 0;
  for (const sc of scenes) {
    if (!isFull(sc)) continue;
    const env = envelope(frame, sc.start * fps, sc.end * fps, 6);
    if (isOpaque(sc)) opaque = Math.max(opaque, env);
    else full = Math.max(full, env);
  }

  // zooms : chaque retour à la face cam alterne le cadrage
  const cuts = [0, ...scenes.filter(isFull).map((s) => s.end).sort((a, b) => a - b)];
  const idx = cuts.filter((c) => c <= t).length - 1;
  const segStart = cuts[Math.max(0, idx)];
  const scales = [1.0, 1.13, 1.05, 1.18];
  const base = scales[Math.max(0, idx) % scales.length];
  const push = interpolate(t - segStart, [0, 6], [0, 0.035], { extrapolateRight: 'clamp' });
  const scale = base + push;

  const split = plan.format === '16:9';
  const box = split
    ? { x: width * 0.625, y: height * 0.1, w: width * 0.32, h: height * 0.7, r: 30 }
    : { x: 0, y: 0, w: width, h: height, r: 0 };
  const lerp = (a: number, b: number) => a + (b - a) * full;
  const rect = { x: lerp(0, box.x), y: lerp(0, box.y), w: lerp(width, box.w), h: lerp(height, box.h), r: lerp(0, box.r) };
  const blur = split ? 0 : 34 * full;
  const dim = split ? 0 : 0.6 * full;

  return (
    <AbsoluteFill>
      {split && full > 0 && <AbsoluteFill style={{ opacity: full }}><Backdrop file={plan.bgFile} dur={plan.bgDuration} /></AbsoluteFill>}
      <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, overflow: 'hidden', opacity: 1 - opaque, boxShadow: split && full > 0 ? `0 30px 80px rgba(0,0,0,${0.5 * full})` : undefined, border: split && full > 0.5 ? `2px solid ${T.border}` : undefined }}>
        <OffthreadVideo
          src={staticFile(plan.video!)}
          volume={1}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${full > 0 && !split ? 1.1 : scale})`, transformOrigin: '50% 38%', filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}
        />
        {dim > 0 && <AbsoluteFill style={{ background: `rgba(6,7,6,${dim})` }} />}
      </div>
    </AbsoluteFill>
  );
};

const Brand: React.FC<{ text: string; format: Plan['format'] }> = ({ text, format }) => {
  const big = format === '9:16';
  return (
    <div style={{ position: 'absolute', top: big ? 64 : 40, left: big ? 0 : 48, right: big ? 0 : undefined, display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(10,11,10,0.78)', border: `1.5px solid ${T.border}`, borderRadius: 999, padding: big ? '10px 22px' : '8px 18px' }}>
        <div style={{ width: 12, height: 12, borderRadius: 99, background: T.lime, boxShadow: `0 0 12px ${T.lime}` }} />
        <span style={{ fontFamily: T.ui, fontWeight: 800, fontSize: big ? 26 : 22, color: T.text, letterSpacing: '0.04em' }}>{text}</span>
      </div>
    </div>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  return <div style={{ position: 'absolute', top: 0, left: 0, height: 7, width: (width * frame) / durationInFrames, background: T.lime, boxShadow: `0 0 14px ${T.lime}` }} />;
};

const renderScene = (sc: Scene, plan: Plan) => {
  const props = { sc, format: plan.format, voiceMode: plan.mode === 'voice', sfxVol: plan.sfxVolume ?? 0.4 };
  switch (sc.type) {
    case 'card': return <CardScene {...props} />;
    case 'steps': return <StepsScene {...props} />;
    case 'checklist': return <StepsScene {...props} check />;
    case 'image': return <ImageScene {...props} />;
    case 'bigword': return <BigWordScene {...props} />;
    case 'counter': return <CounterScene {...props} />;
    case 'flash': return <FlashScene {...props} />;
    case 'cta': return <CtaScene {...props} />;
    case 'hook': return <HookOverlay {...props} />;
    case 'chips': return <ChipsOverlay {...props} />;
    case 'stepper': return <StepperOverlay {...props} />;
    case 'badge': return <BadgeOverlay {...props} />;
    case 'overlay': return <OverlayScene {...props} />;
    case 'frame': return <FrameScene {...props} />;
    case 'process': return <ProcessScene {...props} />;
    default: return null;
  }
};

const SFX_FOR: Record<string, string> = {
  card: 'whoosh', steps: 'whoosh', checklist: 'whoosh', image: 'whoosh', bigword: 'hit', counter: 'riser',
  flash: 'hit', cta: 'whoosh', chips: 'pop', stepper: 'pop', badge: 'pop', hook: 'pop', frame: 'whoosh', process: 'whoosh',
};

export const Main: React.FC<Plan> = (plan) => {
  applyTheme(plan.theme);
  const { fps } = useVideoConfig();
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    (document as any).fonts.ready.then(() => continueRender(handle));
  }, [handle]);
  const voice = plan.mode === 'voice';
  const sfxVol = plan.sfxVolume ?? 0.4;
  const sorted = [...plan.scenes].sort((a, b) => a.start - b.start);

  return (
    <AbsoluteFill style={{ background: T.bg }}>
      {voice ? <Backdrop file={plan.bgFile} dur={plan.bgDuration} /> : <FaceLayer plan={plan} />}
      {voice && plan.audio && <Audio src={staticFile(plan.audio)} />}
      {plan.music && <Audio src={staticFile(plan.music)} volume={(f) => (plan.musicVolume ?? 0.08) * Math.min(1, f / 30)} loop />}

      <ScenesLayer scenes={sorted} plan={plan} />

      <Captions words={plan.words} scenes={plan.scenes} format={plan.format} voiceMode={voice} />
      {plan.brand ? <Brand text={plan.brand} format={plan.format} /> : null}
      {plan.progressBar !== false && <Progress />}

      {plan.sfx !== false &&
        sorted.map((sc, i) => {
          const name = SFX_FOR[sc.type];
          if (!name) return null;
          return (
            <Sequence key={'s' + i} from={Math.max(0, Math.round(sc.start * fps) - (name === 'whoosh' ? 4 : 0))} durationInFrames={45}>
              <Audio src={staticFile(`sfx/${name}.wav`)} volume={sfxVol} />
            </Sequence>
          );
        })}
      {plan.sfx !== false &&
        sorted.filter((s) => s.type === 'steps' || s.type === 'checklist').flatMap((sc, i) =>
          (sc.items ?? []).map((_, j) => {
            const n = sc.items!.length;
            const times = (sc as any).times as number[] | undefined;
            const at = times?.[j] ?? sc.start + 0.15 + ((sc.end - sc.start) * 0.65 * j) / Math.max(1, n);
            return (
              <Sequence key={`c${i}-${j}`} from={Math.round(at * fps)} durationInFrames={20}>
                <Audio src={staticFile('sfx/click.wav')} volume={sfxVol * 0.9} />
              </Sequence>
            );
          }),
        )}
    </AbsoluteFill>
  );
};

const ScenesLayer: React.FC<{ scenes: Scene[]; plan: Plan }> = ({ scenes, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {scenes.map((sc, i) => {
        const a = Math.round(sc.start * fps) - 8;
        const b = Math.round(sc.end * fps) + 8;
        if (frame < a || frame > b) return null;
        return <AbsoluteFill key={i}>{renderScene(sc, plan)}</AbsoluteFill>;
      })}
    </>
  );
};
