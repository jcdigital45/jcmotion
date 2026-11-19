"""Liste la bibliothèque JC Motion : python3 scripts/list_lib.py [catégorie|mot-clé]"""
import json, os, sys
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cp = os.path.join(P, 'public', 'lib', 'catalog.json')
c = json.load(open(cp))['clips'] if os.path.exists(cp) else []
if not c:
    print("Bibliothèque vide. Ajoute tes clips dans mes-clips/ puis lance : python scripts/import_clips.py")
q = sys.argv[1].lower() if len(sys.argv) > 1 else ''
NOMS = {'fx': 'effets', 'transition': 'transitions', 'annot': 'annotations', 'icon': 'icônes', 'logo': 'logos',
        'outro': 'fin', 'gs': 'fonds verts', 'bg': 'fonds', 'broll': 'b-roll', 'illus': 'illustrations',
        'ui': 'maquettes/chiffres', 'perso': 'personnages'}
for cat in NOMS:
    rows = [x for x in c if x['cat'] == cat and (not q or q in cat or q in x['id'] or any(q in t for t in x['tags']))]
    if not rows:
        continue
    print(f"\n## {NOMS[cat]} ({cat})")
    for x in rows:
        fmt = 'V' if x['h'] > x['w'] else 'H'
        print(f"- {x['id']:34s} {x['mode']:6s} {fmt} {x['duration']:5.1f}s  thèmes:{','.join(x['themes'])}  {' '.join(x['tags'])}{'  [son]' if x['audio'] else ''}")
