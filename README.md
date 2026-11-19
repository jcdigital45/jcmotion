# JC Motion — édition communauté 🎬

Monte automatiquement tes vidéos **face caméra** ou tes **voix off** en **motion design** avec l'IA :
sous-titres animés mot par mot, cartes, listes animées, compteurs, mots géants, bruitages, 7 ambiances de couleurs, en **9:16** (TikTok, Reels, Shorts) ou **16:9** (YouTube).

Proposé par **JC Digital**.

---

## Ce qu'il te faut

| Avec… | Il te faut |
|---|---|
| **Claude** (claude.ai, appli mobile ou ordinateur) | Un abonnement Claude payant avec l'exécution de code activée |
| **OpenCode** (gratuit, sur ton ordinateur) | Node.js 20+, Python 3.9+, FFmpeg, Git |
| **Claude Code** (sur ton ordinateur) | Les mêmes outils qu'OpenCode |

Installer les outils sous **Windows** (PowerShell) :
```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Gyan.FFmpeg
winget install Git.Git
```
Sous **Mac** : `brew install node python ffmpeg git`

---

## Installation

### Option A — Claude (web, appli mobile, appli ordinateur)
1. Télécharge **`installer/jcmotion-skill.zip`** depuis ce dépôt (bouton *Download raw file*).
2. Dans Claude : **Paramètres → Capacités** (ou *Skills*) → **Ajouter un skill / Importer** → choisis le zip.
3. Vérifie que l'**exécution de code** est activée dans les paramètres.
4. Dans une nouvelle conversation, envoie ta vidéo ou ta voix et écris : *« Monte cette vidéo en motion design 9:16 avec jcmotion »*.

Claude télécharge lui-même le kit depuis ce dépôt la première fois.

### Option B — OpenCode ou Claude Code (sur ton ordinateur)
```bash
git clone https://github.com/jcdigital45/jcmotion
cd jcmotion
python scripts/setup.py
```
Puis lance **`opencode`** (ou `claude`) **dans ce dossier** et écris :
*« Monte la vidéo C:\Users\moi\Videos\ma-video.mp4 en 9:16 avec le skill jcmotion »*.

Le skill est déjà dans le dépôt (`.claude/skills/jcmotion/`), OpenCode et Claude Code le trouvent tout seuls. La vidéo finie arrive dans le dossier `out/`.

---

## Ajouter tes propres effets (optionnel)
1. Mets tes clips (transitions, fonds verts, confettis, logos animés, musiques…) dans **`mes-clips/`**.
2. Lance `python scripts/import_clips.py` : les fonds verts sont détourés, les fonds noirs préparés, tout est classé.
3. L'IA les utilise ensuite dans tes montages.

N'importe que des clips que tu as le droit d'utiliser.

---

## Les 7 ambiances
`neon` · `vert` · `violet` · `rouge` · `bleu` · `clair` · `or`. L'IA choisit selon le sujet de ta vidéo, ou tu lui demandes celle que tu veux.

## Bon à savoir
- Première installation : 2 à 5 minutes (modèle de transcription ≈480 Mo).
- Rendu : compte environ 3 à 6 secondes de calcul par seconde de vidéo.
- La transcription peut se tromper sur les noms de marques : l'IA te signale ce qu'elle a corrigé.
