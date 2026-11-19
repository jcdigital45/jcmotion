"""JC Motion — préparation d'une vidéo face caméra (ou d'une voix off).

Usage :
  python3 prepare.py <entrée.mp4|.mp3|.wav|.m4a> --format 9:16|16:9 --project <dossier jc-motion>
         [--no-cut] [--gap 0.35] [--model <dossier whisper>]

Produit dans <project>/public/ :
  input.mp4 (vidéo recadrée, silences coupés)  ou  voice.m4a (mode voix)
et dans <project>/work/ :
  transcript.json  {mode, format, duration, video|audio, words:[{w,s,e}]}
  transcript.txt   texte lisible avec horodatage par phrase
"""
import argparse, json, os, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('--format', default='9:16', choices=['9:16', '16:9'])
ap.add_argument('--project', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap.add_argument('--no-cut', action='store_true', help='ne pas couper les silences')
ap.add_argument('--gap', type=float, default=0.35, help='silence minimum à couper (s)')
ap.add_argument('--model', default=os.path.expanduser('~/models/whisper-small') if os.path.exists(os.path.expanduser('~/models/whisper-small/model.bin')) else 'small')
ap.add_argument('--lang', default='fr')
a = ap.parse_args()

pub = os.path.join(a.project, 'public'); work = os.path.join(a.project, 'work')
os.makedirs(pub, exist_ok=True); os.makedirs(work, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        sys.exit(r.stderr.decode()[-2000:])
    return r.stdout

probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', a.src]))
vstreams = [s for s in probe['streams'] if s['codec_type'] == 'video' and s.get('disposition', {}).get('attached_pic', 0) == 0]
has_video = bool(vstreams)
mode = 'facecam' if has_video else 'voice'

def load_audio(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-f', 's16le', '-ac', '1', '-ar', '16000', '-'])
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def transcribe(audio):
    from faster_whisper import WhisperModel
    m = WhisperModel(a.model, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(audio, language=a.lang, word_timestamps=True, vad_filter=False, beam_size=5)
    words = []
    for s in segs:
        for w in s.words or []:
            txt = w.word.strip()
            if txt and words and txt[0] in "'’-" and w.start - words[-1]['e'] < 0.15:
                words[-1]['w'] += txt.replace(' ', ''); words[-1]['e'] = round(float(w.end), 3)
            elif txt:
                words.append({'w': txt, 's': round(float(w.start), 3), 'e': round(float(w.end), 3)})
    return words

print('Transcription…', flush=True)
words = transcribe(load_audio(a.src))
if not words:
    sys.exit('Aucune parole détectée.')
dur_src = float(probe['format']['duration'])

# --- intervalles conservés (coupe des silences / blancs) ---
if a.no_cut:
    keep = [(0.0, dur_src)]
else:
    keep = []
    for w in words:
        s, e = max(0, w['s'] - 0.08), min(dur_src, w['e'] + 0.14)
        if keep and s - keep[-1][1] < a.gap:
            keep[-1] = (keep[-1][0], max(keep[-1][1], e))
        else:
            keep.append((s, e))
    # fusionne les chevauchements
    merged = []
    for s, e in keep:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    keep = merged

def remap(t):
    acc = 0.0
    for s, e in keep:
        if t < s:
            return acc
        if t <= e:
            return acc + (t - s)
        acc += e - s
    return acc

for w in words:
    w['s'] = round(remap(w['s']), 3); w['e'] = round(max(remap(w['e']), w['s'] + 0.05), 3)
duration = round(sum(e - s for s, e in keep), 3)

# --- montage ffmpeg ---
W, H = (1080, 1920) if a.format == '9:16' else (1920, 1080)
parts = []
fc = []
for i, (s, e) in enumerate(keep):
    if has_video:
        fc.append(f'[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[v{i}];')
    fc.append(f'[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, e - s - 0.015):.3f}:d=0.015[a{i}];')
n = len(keep)
if has_video:
    fc.append(''.join(f'[v{i}][a{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=1[vc][ac];')
    vw, vh = int(vstreams[0]['width']), int(vstreams[0]['height'])
    rot = int(vstreams[0].get('tags', {}).get('rotate', 0) or 0)
    for sd in vstreams[0].get('side_data_list', []) or []:
        if 'rotation' in sd: rot = int(sd['rotation'])
    if abs(rot) in (90, 270): vw, vh = vh, vw
    src_portrait = vh > vw
    tgt_portrait = a.format == '9:16'
    if src_portrait == tgt_portrait or tgt_portrait:
        # recadrage centré (cover)
        fc.append(f'[vc]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=30,setsar=1[vo]')
    else:
        # vertical → 16:9 : fond flouté + vidéo centrée
        fc.append(f'[vc]split[b][f];[b]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:2,eq=brightness=-0.15[bg];'
                  f'[f]scale=-2:{H}[fg];[bg][fg]overlay=(W-w)/2:0,fps=30,setsar=1[vo]')
    out = os.path.join(pub, 'input.mp4')
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', a.src, '-filter_complex', ''.join(fc), '-map', '[vo]', '-map', '[ac]',
           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', out]
    media = {'video': 'input.mp4'}
else:
    fc.append(''.join(f'[a{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1[ac]')
    out = os.path.join(pub, 'voice.m4a')
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', a.src, '-filter_complex', ''.join(fc), '-map', '[ac]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', out]
    media = {'audio': 'voice.m4a'}
print(f'Montage : {n} segment(s) conservé(s), {dur_src:.1f}s → {duration:.1f}s', flush=True)
run(cmd)

data = {'mode': mode, 'format': a.format, 'duration': duration, **media, 'words': words}
json.dump(data, open(os.path.join(work, 'transcript.json'), 'w'), ensure_ascii=False, indent=1)

# transcript lisible : une ligne par phrase, avec index des mots
lines, cur, start_i = [], [], 0
for i, w in enumerate(words):
    if not cur: start_i = i
    cur.append(w['w'])
    if w['w'][-1] in '.!?' or len(cur) >= 18 or i == len(words) - 1:
        lines.append(f"[{words[start_i]['s']:6.2f} → {w['e']:6.2f}] (mots {start_i}-{i}) {' '.join(cur)}")
        cur = []
open(os.path.join(work, 'transcript.txt'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
print(f'\nOK — mode={mode}, durée={duration}s, {len(words)} mots → work/transcript.json')
