---
name: jcmotion
description: Monte une vidéo face caméra ou une voix off en motion design style JC Motion (sous-titres animés, cartes, compteurs, 7 ambiances) en 9:16 ou 16:9. Pour Claude et OpenCode.
---

# JC Motion — édition communauté (par JC Digital)

Tu montes la vidéo brute de l'utilisateur (face caméra, ou voix off seule, éventuellement avec ses captures d'écran et extraits) en motion design : transcription mot par mot, coupe des blancs, sous-titres animés, cartes, listes, compteurs, mots géants, bruitages, rendu MP4 en 9:16 ou 16:9. Réponds dans la langue de l'utilisateur (français par défaut), simplement : beaucoup de gens qui utilisent ce skill débutent.

## Étape 0 — Trouver ou installer le kit
Le kit (moteur Remotion + scripts) est sur GitHub : `https://github.com/jcdigital45/jcmotion`.
- Commande Python : `python` sous Windows, `python3` ailleurs. Ci-dessous : `python`.
- **Si le dossier courant contient `scripts/setup.py` et `src/Main.tsx`** (cas OpenCode / Claude Code ouvert dans le dépôt) : KIT = dossier courant.
- **Sinon** : KIT = `~/jcmotion` ; s'il n'existe pas : `git clone --depth 1 https://github.com/jcdigital45/jcmotion ~/jcmotion` (délai généreux, ≈5 min).
- Puis, à chaque nouvelle session : `python <KIT>/scripts/setup.py` (rapide si déjà installé). Il vérifie Node.js et FFmpeg et explique comment les installer s'ils manquent : relaie ces instructions telles quelles et arrête-toi là tant qu'ils manquent.
- En session cloud (Claude sur le web ou mobile) : si Chrome est en `/usr/bin/google-chrome`, il est utilisé ; sinon Remotion télécharge le sien.

## Étape 1 — Récupérer la matière
- La vidéo ou l'audio : pièce jointe dans la conversation, ou chemin d'un fichier sur l'ordinateur (OpenCode).
- Si le format n'est pas dit : **9:16** (TikTok, Reels, Shorts) ou **16:9** (YouTube) ? Une seule question.
- Ses visuels (captures d'écran, logos, extraits vidéo) → copie-les dans `<KIT>/public/` et note leurs noms.
- Ses propres clips d'effets (transitions, fonds verts, logos animés…) : s'il en a, qu'il les mette dans `<KIT>/mes-clips/`, puis `python <KIT>/scripts/import_clips.py` (détourage et classement automatiques). `python <KIT>/scripts/list_lib.py` liste la bibliothèque. Sans clips, tout fonctionne quand même.

## Étape 2 — Préparer
```bash
cd <KIT> && python scripts/prepare.py "<fichier>" --format 9:16   # ou 16:9 ; --no-cut garde les blancs
```
→ `public/input.mp4` (recadrée, blancs > 0,35 s coupés) ou `public/voice.m4a` (voix seule), `work/transcript.json` et `work/transcript.txt` (phrases + index des mots).

## Étape 3 — Choisir l'ambiance selon le sujet
| Sujet | Thème |
|---|---|
| IA, outils, logiciels, tech, tuto d'app | `bleu` (losanges d'étapes) ou `neon` (traits lumineux) |
| Formations, produits digitaux, premium | `violet` (verre, cartes 01/02) |
| YouTube, abonnés, croissance, alerte, arnaque | `rouge` (pastilles brillantes, questions) |
| Argent, business, revenus, bonus | `vert` (vert citron) ou `or` (lumières chaudes) |
| Tuto calme, process, comparatif | `clair` (fond blanc) |
Annonce le thème en une ligne ; l'utilisateur peut en demander un autre.

## Étape 4 — Écrire `work/scenes.json`
```json
{
  "theme": "bleu",
  "fix": {"20": "SMS,"},
  "keywords": [7, 12, 19],
  "music": null, "musicVolume": 0.08, "sfx": true, "progressBar": true,
  "scenes": [ { "type": "hook", "start": 0, "end": 2.4, "title": "Ton *style* à toi" } ]
}
```
- `fix` : corrige les mots mal transcrits (marques, chiffres), index → texte. Signale à l'utilisateur les corrections incertaines.
- `keywords` : index des mots en couleur d'accent (≈1 par phrase).
- `music` : un fichier de `public/` (par ex. `music/xxx.mp3` après import).
- `brand` : texte d'une petite pastille en haut, seulement si l'utilisateur le demande.
- Temps en secondes, timeline APRÈS coupe des blancs ; cale `start` sur le début d'un mot. `*mot*` = accent, `\n` = retour à la ligne.

### Scènes
**Sur la face cam** — `hook` {title} accroche · `chips` {items[]} pastilles numérotées · `stepper` {items[], active} frise ✓—✓—○ · `badge` {tag, text}.

**Plein écran** (9:16 : sur face cam floutée · 16:9 : à gauche, face cam encadrée à droite)
- `card` {window plain|mac|phone, tag, title, subtitle, prefix/price/unit, items[], src}
- `steps` {label, title, items[], times[], style list|diamonds|questions|cards} (style par défaut selon le thème)
- `checklist` {label, title, items[], times[]}
- `image` {src, window mac|phone|plain, title, label, tag}
- `process` {from, to, center, subtitle} — schéma départ → cercle → arrivée
- `frame` {clip, src, title} — une capture insérée dans un clip « cadre » de sa bibliothèque (ceux marqués « cadre à remplir » par l'import)

**Ponctuations** — `bigword` {text, bg black|lime|face, style "pill"} · `counter` {value, prefix, suffix, text, tag} · `flash` {color} · `cta` {title, button, subtitle}.

**Clips de sa bibliothèque** (seulement s'il en a importé) — `overlay` {clip, pos full|center|top|bottom|left|right|topleft|topright|bottomleft|bottomright|caption, size, sound, opacity}.

### Règles de rythme
1. `hook` sur les 2-3 premières secondes, plus un `bigword` ou `counter` dans les 5 premières si la phrase a un mot ou un chiffre fort.
2. Quelque chose change toutes les 2-4 s (superposition, carte, zoom automatique au retour face cam).
3. Une scène plein écran toutes les 6-10 s, 1,5 à 4 s, collée à ce que dit la voix ; pas plus de ~45 % de la vidéo.
4. `bigword` : 1-2 par 30 s, 0,6-1,2 s, jamais deux de suite.
5. Énumérations parlées → `steps`/`checklist` avec `times` calés sur chaque mot. Prix → `card` ou `counter`.
6. Dernières 2-4 s : `cta`.
7. N'invente rien : les textes viennent de ce qui est dit ou des visuels fournis.

## Étape 5 — Vérifier puis rendre
```bash
cd <KIT> && python scripts/render.py --stills 1,6.5,12,20     # aperçus dans out/stills/
python scripts/render.py --out out/<nom>.mp4
```
Regarde les aperçus avant le rendu final (texte qui déborde, contraste, carte trop chargée). Puis :
- session Claude (web/mobile) : envoie le MP4 à l'utilisateur ;
- OpenCode / Claude Code sur son ordinateur : donne-lui le chemin complet du MP4 dans `out/`.
Précise le thème utilisé et les mots corrigés incertains.
