# v3.1: Test-Flieger-Zeiten vorher/nachher vergleichen (Median je Level/Stufe/Modus aus flieger.py --seeds N).
# Aufruf: python3 tests/flieger_vergleich.py <vorher.json> <nachher.json>   → Tabelle je Leveltyp + langsamere Level
import json, sys, re, statistics as st
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
src = open('js/game/levels.js', encoding='utf-8').read()
typ = {}
for m in re.finditer(r"id: '(\d-\d)'.*?tasks: \[(.*?)\]", src): typ[m.group(1)] = sorted(set(re.findall(r"type: '(\w+)'", m.group(2))))
def gruppe(lid):
    t = typ.get(lid, [])
    if 'race' in t: return 'Wettflug'
    if 'rings' in t: return 'Ringe'
    if 'land' in t: return 'Landen'
    if 'visit' in t or 'deliver' in t: return 'Tiere'
    if 'stunts' in t: return 'Kunststück'
    return 'Sammeln'
rows = []
for k in sorted(a):
    if '#' in k or k not in b: continue
    x, y = a[k], b[k]
    if x['state'] != 'won' or y['state'] != 'won':
        print('Zustand', k, x['state'], '->', y['state']); continue
    lid, d, m = k.split('_')
    rows.append((k, gruppe(lid) if m == 'frei' else 'Wettflug (Rennen)', y['t'] / x['t'], x['t'], y['t']))
print('| Gruppe | Läufe | Median nachher/vorher | schnellstes | langsamstes |')
print('|---|---|---|---|---|')
for g in sorted(set(r[1] for r in rows)):
    q = [r[2] for r in rows if r[1] == g]
    print(f'| {g} | {len(q)} | {st.median(q):.3f} | {min(q):.2f} | {max(q):.2f} |')
q = [r[2] for r in rows]; print(f'| alle | {len(q)} | {st.median(q):.3f} | {min(q):.2f} | {max(q):.2f} |')
print('langsamer als vorher (> 1,05):')
for r in sorted(rows, key=lambda r: -r[2]):
    if r[2] > 1.05: print(' ', r[0], r[3], '->', r[4], f'{r[2]:.3f}')
