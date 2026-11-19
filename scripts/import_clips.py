"""Ajoute TES clips à la bibliothèque JC Motion.

1. Mets tes vidéos (effets, transitions, fonds verts, logos animés, fonds, b-roll…) dans le dossier mes-clips/
   (des sous-dossiers comme « transitions », « fonds », « logos » aident au classement).
2. Lance :  python scripts/import_clips.py
   → les fonds verts sont détourés, les fonds noirs préparés pour la superposition, tout est allégé
     et classé dans public/lib/catalog.json. Les musiques (mp3, wav, m4a) vont dans public/music/.

Relançable : les clips déjà importés sont ignorés.
"""
import json, os, re, shutil, subprocess, sys, unicodedata
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'mes-clips')
LIB = os.path.join(ROOT, 'public', 'lib')
MUSIC = os.path.join(ROOT, 'public', 'music')
CAT = os.path.join(LIB, 'catalog.json')
VID = ('.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi')
AUD = ('.mp3', '.wav', '.m4a', '.aac', '.ogg')

KEYS = [  # (mots dans le chemin, catégorie)
    (('transition', 'trans', 'wipe', 'whoosh'), 'transition'),
    (('fond_vert', 'fonds_verts', 'green', 'greenscreen', 'chroma'), 'gs'),
    (('fond', 'background', 'bg', 'loop', 'arriere'), 'bg'),
    (('logo', 'icone', 'icon'), 'logo'),
    (('fleche', 'arrow', 'cercle', 'circle', 'souligne', 'underline', 'annot', 'doodle', 'scribble'), 'annot'),
    (('subscribe', 'abonne', 'outro', 'fin', 'end'), 'outro'),
    (('broll', 'b-roll', 'stock'), 'broll'),
    (('perso', 'character', 'mascotte'), 'perso'),
    (('compteur', 'counter', 'chart', 'graph', 'ui', 'mockup'), 'ui'),
]
SUB = {'bg': 'fonds', 'broll': 'broll', 'illus': 'illustrations', 'gs': 'fonds_verts', 'fx': 'effets', 'transition': 'transitions',
       'annot': 'annotations', 'icon': 'icones', 'logo': 'logos', 'outro': 'fin', 'ui': 'elements', 'perso': 'personnages'}


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')[:40] or 'clip'


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', p],
                       capture_output=True)
    j = json.loads(r.stdout or '{}')
    v = [s for s in j.get('streams', []) if s.get('codec_type') == 'video']
    if not v:
        return None
    return dict(w=int(v[0]['width']), h=int(v[0]['height']), d=float(j['format'].get('duration', 0) or 0),
                audio=any(s.get('codec_type') == 'audio' for s in j['streams']))


def frame_rgb(p, t, w=160):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-ss', f'{t:.2f}', '-i', p, '-frames:v', '1', '-vf', f'scale={w}:-2',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    if not raw:
        return None
    return np.frombuffer(raw, np.uint8).reshape(-1, w, 3).astype(int)


def analyse(p, d):
    green, dark, keys = [], [], []
    for f in (0.2, 0.5, 0.8):
        a = frame_rgb(p, d * f)
        if a is None:
            continue
        px = a.reshape(-1, 3)
        g = (px[:, 1] > 140) & (px[:, 0] < 130) & (px[:, 2] < 130)
        green.append(g.mean()); dark.append((px.max(1) < 28).mean())
        if g.any():
            keys.append(np.median(px[g], 0))
    if green and max(green) > 0.12:
        c = np.median(keys, 0).astype(int)
        return 'chroma', '0x%02X%02X%02X' % tuple(c)
    if dark and np.mean(dark) > 0.45:
        return 'screen', None
    return 'full', None


def category(rel, mode):
    low = rel.lower()
    for words, cat in KEYS:
        if any(w in low for w in words):
            return cat
    return {'chroma': 'gs', 'screen': 'fx'}.get(mode, 'broll')


def hole_of(webm, d):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-c:v', 'libvpx-vp9', '-ss', f'{d * 0.6:.2f}', '-i', webm, '-frames:v', '1',
                          '-vf', 'scale=320:-2', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], capture_output=True).stdout
    if not raw:
        return None
    a = np.frombuffer(raw, np.uint8).reshape(-1, 320, 4)[:, :, 3]
    h = a.shape[0]
    m = a < 40
    edge = np.concatenate([m[0], m[-1], m[:, 0], m[:, -1]]).mean()
    if m.mean() < 0.05 or edge > 0.3:  # transparent jusqu'aux bords → pas un cadre à remplir
        return None
    ys, xs = np.where(m)
    x0, x1, y0, y1 = np.percentile(xs, 2), np.percentile(xs, 98), np.percentile(ys, 2), np.percentile(ys, 98)
    return [round(float(x0) / 320, 3), round(float(y0) / h, 3), round(float(x1 - x0) / 320, 3), round(float(y1 - y0) / h, 3)]


def main():
    if not os.path.isdir(SRC):
        os.makedirs(SRC); print('Dossier mes-clips/ créé : mets-y tes vidéos puis relance.'); return
    os.makedirs(LIB, exist_ok=True)
    cat = json.load(open(CAT)) if os.path.exists(CAT) else {'version': 1, 'clips': []}
    done = {c.get('source') for c in cat['clips']}
    ids = {c['id'] for c in cat['clips']}
    added = 0
    for dirpath, _, files in os.walk(SRC):
        for f in sorted(files):
            p = os.path.join(dirpath, f); rel = os.path.relpath(p, SRC); ext = os.path.splitext(f)[1].lower()
            if ext in AUD:
                os.makedirs(MUSIC, exist_ok=True)
                dst = os.path.join(MUSIC, slug(os.path.splitext(f)[0]) + ext)
                if not os.path.exists(dst):
                    shutil.copy(p, dst); print(f'♪ musique : music/{os.path.basename(dst)}')
                continue
            if ext not in VID or rel in done:
                continue
            info = probe(p)
            if not info or info['d'] < 0.2:
                print(f'– ignoré (illisible) : {rel}'); continue
            mode, key = analyse(p, info['d'])
            c = category(rel, mode)
            base = slug(os.path.splitext(f)[0]); cid = base; k = 2
            while cid in ids:
                cid = f'{base}_{k}'; k += 1
            os.makedirs(os.path.join(LIB, SUB[c]), exist_ok=True)
            vert = info['h'] > info['w']
            sc = 'scale=720:-2' if vert else "scale='min(1280,iw)':-2"
            dur = min(info['d'], 15.0)
            cmd = ['ffmpeg', '-v', 'error', '-y', '-t', f'{dur:.2f}', '-i', p]
            if mode == 'chroma':
                out = os.path.join(LIB, SUB[c], cid + '.webm')
                cmd += ['-vf', f'{sc},fps=30,chromakey={key}:0.17:0.08,despill=green,format=yuva420p', '-c:v', 'libvpx-vp9',
                        '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '34', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1',
                        '-c:a', 'libopus', '-b:a', '96k', out]
            else:
                out = os.path.join(LIB, SUB[c], cid + '.mp4')
                cmd += ['-vf', f'{sc},fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
                        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]
            r = subprocess.run(cmd, capture_output=True)
            if r.returncode:
                print(f'✗ échec : {rel}'); continue
            o = probe(out)
            entry = dict(id=cid, file=os.path.relpath(out, LIB).replace(os.sep, '/'), cat=c, mode=mode, themes=['*'],
                         tags=[t for t in re.split(r'[^a-z0-9]+', slug(os.path.splitext(rel)[0])) if len(t) > 2][:8], w=o['w'], h=o['h'],
                         duration=round(o['d'], 2), audio=o['audio'], source=rel)
            if mode == 'chroma':
                hole = hole_of(out, o['d'])
                if hole:
                    entry['hole'] = hole
            cat['clips'].append(entry); ids.add(cid); added += 1
            print(f"+ {cid:30s} {c:10s} {mode:6s} {'(cadre à remplir)' if entry.get('hole') else ''}")
            json.dump(cat, open(CAT, 'w'), ensure_ascii=False, indent=1)
    print(f'\n✓ {added} clip(s) ajouté(s) — bibliothèque : {len(cat["clips"])} clips. Liste : python scripts/list_lib.py')


if __name__ == '__main__':
    main()
