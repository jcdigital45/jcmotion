"""Génère les bruitages JC Motion (aucun téléchargement nécessaire)."""
import numpy as np, wave, sys, os
SR = 48000
out = sys.argv[1] if len(sys.argv) > 1 else 'public/sfx'
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)

def save(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(f'{out}/{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())

def lp(x, a):  # filtre passe-bas 1 pôle à coefficient variable
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y

t = lambda d: np.linspace(0, d, int(SR * d), endpoint=False)

# whoosh : bruit filtré qui monte puis descend
d = 0.55; tt = t(d); n = rng.standard_normal(len(tt))
env = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
a = 0.02 + 0.25 * np.sin(np.pi * tt / d) ** 3
save('whoosh', lp(n, a) * env)

# pop : petit blip sinus glissant
d = 0.16; tt = t(d)
f = 900 * np.exp(-tt * 18) + 380
save('pop', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28))

# click : clic UI sec
d = 0.06; tt = t(d)
save('click', (np.sin(2 * np.pi * 2400 * tt) * 0.6 + rng.standard_normal(len(tt)) * 0.4) * np.exp(-tt * 120))

# hit : impact grave + souffle (mots géants)
d = 0.7; tt = t(d)
f = 140 * np.exp(-tt * 9) + 45
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6)
air = lp(rng.standard_normal(len(tt)), np.full(len(tt), 0.08)) * np.exp(-tt * 14) * 0.6
save('hit', boom + air)

# riser : montée pour les compteurs
d = 1.0; tt = t(d)
f = 200 + 900 * (tt / d) ** 2
x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + lp(rng.standard_normal(len(tt)), 0.03 + 0.3 * (tt / d)) * 0.6
save('riser', x * (tt / d) ** 1.5 * np.exp(-np.clip(tt - 0.9, 0, 1) * 40))
print('sfx ok ->', out)
