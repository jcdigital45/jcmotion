"""JC Motion Communauté — installation (Windows, Mac, Linux, ou session Claude dans le cloud).

    python scripts/setup.py

Installe : faster-whisper (transcription), le modèle Whisper « small », Remotion (rendu vidéo),
les bruitages, et crée les dossiers de travail. Relançable sans risque.
"""
import json, os, shutil, subprocess, sys, tempfile, hashlib, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIN = os.name == 'nt'
MODEL = os.path.expanduser('~/models/whisper-small')
SHA = 'ca732cb1379efc49417d028465f543d83a39de2c61f3027678de103dc404ce73'


def say(msg):
    print(f'» {msg}', flush=True)


def need(cmd, aide):
    if shutil.which(cmd) is None:
        print(f'\n✗ « {cmd} » est introuvable. {aide}\n')
        sys.exit(1)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


# 1. Outils de base
need('node', "Installe Node.js 20+ : https://nodejs.org (Windows : winget install OpenJS.NodeJS.LTS)")
need('ffmpeg', "Installe FFmpeg (Windows : winget install Gyan.FFmpeg ; Mac : brew install ffmpeg ; Linux : sudo apt install ffmpeg)")
NPM = 'npm.cmd' if WIN else 'npm'
if sys.version_info < (3, 9):
    sys.exit('✗ Python 3.9 ou plus récent est nécessaire : https://www.python.org/downloads/')

# 2. faster-whisper
try:
    import faster_whisper  # noqa: F401
except ImportError:
    say('Installation de faster-whisper…')
    base = [sys.executable, '-m', 'pip', 'install', '-q', 'faster-whisper']
    if subprocess.run(base).returncode != 0:
        run(base + ['--break-system-packages'])


# 3. Modèle Whisper small (HuggingFace, sinon copie npm vérifiée)
def model_ok():
    return os.path.exists(os.path.join(MODEL, 'model.bin')) and os.path.exists(os.path.join(MODEL, 'tokenizer.json'))


if not model_ok():
    os.makedirs(MODEL, exist_ok=True)
    say('Téléchargement du modèle de transcription (≈480 Mo)…')
    try:
        from faster_whisper.utils import download_model
        download_model('small', output_dir=MODEL)
    except Exception as e:  # HuggingFace bloqué (sessions cloud) → paquets npm
        say(f'HuggingFace indisponible ({type(e).__name__}), plan B via npm…')
        tmp = tempfile.mkdtemp()
        parts = []
        for i in range(4):
            name = f'@skillninja/shortmovie-telop-model-p{i}@1.0.0'
            run([NPM, 'pack', name, '--silent'], cwd=tmp, stdout=subprocess.DEVNULL)
            tgz = os.path.join(tmp, f'skillninja-shortmovie-telop-model-p{i}-1.0.0.tgz')
            d = os.path.join(tmp, f'p{i}')
            with tarfile.open(tgz) as t:
                t.extractall(d, **({'filter': 'data'} if hasattr(tarfile, 'data_filter') else {}))
            parts.append(os.path.join(d, 'package', f'model.bin.part{i}'))
        h = hashlib.sha256()
        with open(os.path.join(MODEL, 'model.bin'), 'wb') as out:
            for p in parts:
                with open(p, 'rb') as f:
                    while chunk := f.read(1 << 20):
                        out.write(chunk); h.update(chunk)
        if h.hexdigest() != SHA:
            os.remove(os.path.join(MODEL, 'model.bin'))
            sys.exit('✗ Modèle corrompu (checksum invalide).')
        for f in ('config.json', 'preprocessor_config.json', 'tokenizer.json', 'vocabulary.json'):
            shutil.copy(os.path.join(tmp, 'p0', 'package', f), MODEL)
        shutil.rmtree(tmp, ignore_errors=True)

# 4. Remotion et polices
if not os.path.isdir(os.path.join(ROOT, 'node_modules', 'remotion')):
    say('Installation de Remotion (npm install)…')
    run([NPM, 'install', '--no-audit', '--no-fund', '--silent'], cwd=ROOT)

# 5. Dossiers + bruitages
for d in ('public/sfx', 'public/lib', 'mes-clips', 'work', 'out'):
    os.makedirs(os.path.join(ROOT, d), exist_ok=True)
cat = os.path.join(ROOT, 'public', 'lib', 'catalog.json')
if not os.path.exists(cat):
    json.dump({'version': 1, 'clips': []}, open(cat, 'w'))
if not os.path.exists(os.path.join(ROOT, 'public', 'sfx', 'whoosh.wav')):
    try:
        import numpy  # noqa: F401
    except ImportError:
        run([sys.executable, '-m', 'pip', 'install', '-q', 'numpy'])
    run([sys.executable, os.path.join(ROOT, 'scripts', 'make_sfx.py'), os.path.join(ROOT, 'public', 'sfx')])

print('\n✓ JC Motion Communauté est prêt.')
