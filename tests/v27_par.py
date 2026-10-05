# v2.7: par der neuen Missionen aus den Test-Flieger-Zeiten (tests/out/v27_flieger.json, tests/flieger.py).
# Der Autopilot kreist bei Besuchen/Beeren oft lange → einzelne Zeiten streuen stark. Darum: Kosten je Aufgabenteil
# (Sekunden pro Tropfen/Ring/Landung/Besuch/Beere/Kunststück + Start) per kleinste Quadrate (≥ 0) über alle 35
# Nicht-Rennen × 3 Stufen (auf Mittel-Tempo umgerechnet). Maßstab aus den 13 alten Nicht-Rennen-Leveln: Die alten pars
# sind bei Besuchen/Beeren knapper (Median par/Vorhersage ≈ 0,9) als bei Tropfen/Ringen/Landen (≈ 1,5) → zwei Faktoren:
# K_tier (Level mit Besuchen/Beeren) und K_flug (übrige). par = Σ Teile × Kosten × K der Teil-Gruppe, auf 5 s gerundet.
# Ausgabe: tests/out/v27_par.json
import json, statistics as st, re
import numpy as np
d = json.load(open('tests/out/v27_flieger.json'))
SP = {'leicht': 6.3, 'mittel': 7.0, 'schwer': 7.8}
src = open('js/game/levels.js', encoding='utf-8').read()
L = []
for line in src.split('\n'):
    m = re.search(r"id: '(\d-\d)'.*?par: (\d+), tasks: \[(.*?)\], animals", line)
    if m: L.append((m.group(1), int(m.group(2)), re.findall(r"\{ type: '(\w+)'(.*?)\}", m.group(3))))
G = ['collect', 'rings', 'land', 'visit', 'deliver', 'show']
def feat(tasks):
    f = dict.fromkeys(G, 0)
    for t, rest in tasks:
        n = re.search(r"n: (\d+)", rest); s = re.search(r"show: (\d+)", rest)
        if t in ('collect', 'fireflies', 'blossoms'): f['collect'] += int(n.group(1))
        elif t == 'stunts': f['show'] += int(s.group(1))
        elif t in G: f[t] += int(n.group(1))
    return [f[g] for g in G] + [1]
def nnls(A, b, it=20000):
    # projizierter Gradientenabstieg (kein scipy nötig)
    x = np.zeros(A.shape[1]); lr = 1 / np.linalg.norm(A, 2) ** 2
    for _ in range(it): x = np.maximum(0, x - lr * A.T @ (A @ x - b))
    return x
rows = [(l, p, t) for l, p, t in L if not any(x[0] == 'race' for x in t)]
A, b = [], []
for l, p, t in rows:
    for x in SP: A.append(feat(t)); b.append(d[f'{l}_{x}_frei']['t'] * SP[x] / 7.0)
c = nnls(np.array(A, float), np.array(b))
cost = dict(zip(G + ['start'], [round(float(v), 2) for v in c]))
pred = {l: float(np.dot(feat(t), c)) for l, p, t in rows}
HEAVY = ('visit', 'deliver')
heavy = lambda t: any(x[0] in HEAVY for x in t)
old = [(l, p, t) for l, p, t in rows if int(l[2]) <= 3]
Kt = st.median(p / pred[l] for l, p, t in old if heavy(t))
Kf = st.median(p / pred[l] for l, p, t in old if not heavy(t))
print('Kosten je Teil (s, Mittel-Tempo):', cost)
print('alt par/Vorhersage:', ', '.join(f'{l} {p / pred[l]:.2f}' for l, p, t in old), f'→ K_tier = {Kt:.2f}, K_flug = {Kf:.2f}')
def par_of(t):
    f = feat(t)
    return sum(f[i] * c[i] * (Kt if G[i] in HEAVY else Kf) for i in range(len(G))) + c[-1] * Kf
chk = [(l, p, par_of(t)) for l, p, t in old]
print('Gegenprobe alte Level (par alt / Modell):', ', '.join(f'{l} {p}/{m:.0f}' for l, p, m in chk))
out = {}
for l, p, t in rows:
    if int(l[2]) < 4: continue
    pp = int(5 * round(par_of(t) / 5)); out[l] = pp
    ts = d[f'{l}_schwer_frei']['t']; lim = round(pp * 1.8)
    print(f"{l} Modell {par_of(t):5.1f} → par {pp:3d} (Leicht {round(pp * 1.93)} s, Mittel {round(pp * 1.52)} s) · Flieger Mittel {d[f'{l}_mittel_frei']['t']} s · Schwer-Limit {lim} s, Flieger Schwer {ts} s {'ok' if ts < lim else 'ZU KNAPP'}")
json.dump({'K_tier': round(Kt, 3), 'K_flug': round(Kf, 3), 'cost': cost, 'par': out}, open('tests/out/v27_par.json', 'w'), indent=1)
