"""JC Motion — fusionne transcript + scènes en plan.json puis rend la vidéo.

Usage :
  python3 render.py --project <dossier> --scenes work/scenes.json --out sortie.mp4
  python3 render.py --project <dossier> --scenes work/scenes.json --stills 1.5,4,9.2   (aperçus PNG)

scenes.json :
{
  "theme": "vert",                      // neon | vert | violet | rouge | bleu | clair | or
  "background": null,                  // id d'un fond de la bibliothèque, "none", ou null = fond du thème
  "fix": {"20": "SMS,"},               // corrections de mots mal transcrits (index → texte)
  "keywords": [3, 17, 42],            // index de mots (voir transcript.txt) affichés en vert citron
  "keywordWords": ["gratuit", "IA"],   // ou bien des mots (insensible à la casse)
  "music": "music.mp3", "musicVolume": 0.08,   // optionnel, fichier dans public/
  "sfx": true, "progressBar": true,
  "scenes": [ {"type": "hook", "start": 0, "end": 2.4, "title": "Ton *style* à toi"}, ... ]
}
"""
import argparse, json, os, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('--project', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ap.add_argument('--scenes', default='work/scenes.json')
ap.add_argument('--out', default='out/video.mp4')
ap.add_argument('--stills', default='')
ap.add_argument('--format', default=None, help='forcer 9:16 ou 16:9')
a = ap.parse_args()
P = a.project
j = lambda p: p if os.path.isabs(p) else os.path.join(P, p)

tr = json.load(open(j('work/transcript.json')))
sc = json.load(open(j(a.scenes)))
words = tr['words']
for k, v in (sc.get('fix') or {}).items():
    words[int(k)]['w'] = v
kw = set(sc.get('keywords', []))
kww = {re.sub(r'[^\w]', '', x.lower()) for x in sc.get('keywordWords', [])}
for i, w in enumerate(words):
    w['k'] = i in kw or re.sub(r'[^\w]', '', w['w'].lower()) in kww

# --- bibliothèque : clip -> fichier / mode / zone à remplir ---
CAT = {}
catp = os.path.join(P, 'public', 'lib', 'catalog.json')
if os.path.exists(catp):
    CAT = {c['id']: c for c in json.load(open(catp))['clips']}
HOLES = {}  # zones à remplir connues (sinon détectées à l'import)
BG = {}     # fond animé par thème : {'bleu': {'16:9': 'id_du_clip'}} — vide = fond généré en code
def lib(cid):
    if cid not in CAT:
        sys.exit(f"Clip inconnu dans la bibliothèque : {cid} (voir public/lib/catalog.json)")
    return CAT[cid]

scenes = sorted(sc['scenes'], key=lambda s: s['start'])
for s in scenes:
    if s['type'] in ('overlay', 'frame'):
        c = lib(s['clip'])
        s['file'] = c['file']; s['mode'] = c['mode']
        if s['type'] == 'frame':
            s['hole'] = s.get('hole') or HOLES.get(s['clip']) or c.get('hole')
            if not s['hole']:
                sys.exit(f"Le clip {s['clip']} n'a pas de zone à remplir connue")
for s in scenes:
    s['end'] = min(s['end'], tr['duration'])
    for f in ('src',):
        if s.get(f) and not os.path.exists(os.path.join(P, 'public', s[f])):
            sys.exit(f"Fichier introuvable dans public/ : {s[f]}")

plan = {
    'format': a.format or sc.get('format') or tr['format'],
    'fps': 30,
    'duration': tr['duration'],
    'mode': tr['mode'],
    'video': tr.get('video'),
    'audio': tr.get('audio'),
    'music': sc.get('music'),
    'musicVolume': sc.get('musicVolume', 0.08),
    'sfx': sc.get('sfx', True),
    'sfxVolume': sc.get('sfxVolume', 0.4),
    'brand': sc.get('brand'),  # aucune signature par défaut
    'progressBar': sc.get('progressBar', True),
    'theme': sc.get('theme', 'vert'),
    'words': words,
    'scenes': scenes,
}
fmt = plan['format']
bgid = sc.get('background', BG.get(plan['theme'], {}).get(fmt))
if bgid and bgid != 'none' and bgid in CAT:
    plan['bgFile'] = CAT[bgid]['file']; plan['bgDuration'] = CAT[bgid]['duration']
plan = {k: v for k, v in plan.items() if v is not None}
json.dump(plan, open(j('work/plan.json'), 'w'), ensure_ascii=False)

env = dict(os.environ)
base = ['npx.cmd' if os.name == 'nt' else 'npx', 'remotion']
if a.stills:
    os.makedirs(j('out/stills'), exist_ok=True)
    for t in a.stills.split(','):
        f = int(float(t) * 30)
        out = j(f'out/stills/still_{float(t):06.2f}.png')
        r = subprocess.run(base + ['still', 'src/index.ts', 'JCMotion', out, f'--frame={f}', '--props=work/plan.json', '--log=error'], cwd=P, env=env)
        if r.returncode: sys.exit(r.returncode)
        print(out)
else:
    os.makedirs(os.path.dirname(j(a.out)), exist_ok=True)
    r = subprocess.run(base + ['render', 'src/index.ts', 'JCMotion', j(a.out), '--props=work/plan.json',
                               '--codec=h264', '--crf=18', '--x264-preset=veryfast', '--audio-codec=aac', '--log=error'], cwd=P, env=env)
    if r.returncode: sys.exit(r.returncode)
    print('Rendu :', j(a.out))
