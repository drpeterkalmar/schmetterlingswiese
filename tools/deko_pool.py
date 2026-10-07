# Gepoolte Auswertung (alle Einzelbilder mehrerer Runden je Variante): p50/p95 Bildabstand, CPU, GPU + Mittelwert
# Aufruf: python3 tools/deko_pool.py <alt-labels> <neu-labels> [out.json]
import json, sys
def load(ls): return [json.load(open(f'tests/out/deko_perf_{l}.json')) for l in ls.split(',')]
A, B = load(sys.argv[1]), load(sys.argv[2])
def pct(a, p): a = sorted(a); return a[min(len(a) - 1, int(len(a) * p))]
def pool(runs, sc, k): return [x for r in runs for x in r['raw'][sc][k]]
out = {}
print(f"{'Szene':10s} {'Bild p50':>16s} {'Bild p95':>17s} {'Bild Mittel':>17s} {'CPU p95':>17s} {'GPU p50':>17s} {'GPU p95':>17s}  Draw-Calls  Dreiecke")
for sc in A[0]['scenes']:
    row = {}
    for k, stat in [('raf', 0.5), ('raf', 0.95), ('raf', 'mean'), ('cpu', 0.95), ('gpu', 0.5), ('gpu', 0.95)]:
        a, b = pool(A, sc, k), pool(B, sc, k)
        f = (lambda v: sum(v) / len(v)) if stat == 'mean' else (lambda v, s=stat: pct(v, s))
        va, vb = f(a), f(b)
        row[f'{k}_{stat}'] = [round(va, 2), round(vb, 2), round((vb - va) / va * 100, 1)]
    for k in ['calls', 'tris']:
        va = sum(r['scenes'][sc][k] for r in A) / len(A); vb = sum(r['scenes'][sc][k] for r in B) / len(B)
        row[k] = [round(va), round(vb), round((vb - va) / va * 100, 1)]
    out[sc] = row
    cell = lambda v: f"{v[0]:5.2f}→{v[1]:5.2f} {v[2]:+5.1f}%"
    print(f"{sc:10s} " + ' '.join(cell(row[k]) for k in ['raf_0.5', 'raf_0.95', 'raf_mean', 'cpu_0.95', 'gpu_0.5', 'gpu_0.95']) + f"  {row['calls'][0]}→{row['calls'][1]}  {row['tris'][0]//1000}k→{row['tris'][1]//1000}k")
if len(sys.argv) > 3: json.dump(out, open(sys.argv[3], 'w'), indent=1)
