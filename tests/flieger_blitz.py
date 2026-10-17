# v3.1 Messgröße 7: Anteil der Autopilot-Läufe mit ⚡ Blitzzeit (3 Sterne) in Wettflügen (Einzelläufe '#k' aus flieger.py --seeds)
import json, sys
for f in sys.argv[1:]:
    d = json.load(open(f)); n = b = 0; per = {}
    for k, r in d.items():
        if '#' not in k: continue
        lid, diff, m = k.split('#')[0].split('_')
        if m != 'rennen' and not k.startswith(tuple(x.split('_')[0] for x in d if x.endswith('_rennen'))): continue
        if m != 'frei': continue
        if not any(x.startswith(lid + '_') and x.endswith('_rennen') for x in d): continue
        n += 1; ok = r['state'] == 'won' and r.get('stars', 0) >= 3; b += ok
        per.setdefault(f'{lid} {diff}', []).append(ok)
    print(f, f'Blitzzeit in {b}/{n} Läufen = {100 * b / max(1, n):.0f} %', {k: sum(v) for k, v in sorted(per.items())})
