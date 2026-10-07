# Vergleich der Deko-Messläufe: Mittel über Runden je Szene (alt vs. neu), Änderung in %
# Aufruf: python3 tools/deko_compare.py <alt-label,…> <neu-label,…>
import json, sys
A = [json.load(open(f'tests/out/deko_perf_{l}.json')) for l in sys.argv[1].split(',')]
B = [json.load(open(f'tests/out/deko_perf_{l}.json')) for l in sys.argv[2].split(',')]
keys = ['raf_p50', 'raf_p95', 'cpu_p50', 'cpu_p95', 'gpu_p50', 'gpu_p95', 'calls', 'tris']
mean = lambda runs, sc, k: sum(r['scenes'][sc][k] for r in runs) / len(runs)
print(f"{'Szene':10s} " + ' '.join(f'{k:>20s}' for k in keys))
out = {}
for sc in A[0]['scenes']:
    row = []
    for k in keys:
        a, b = mean(A, sc, k), mean(B, sc, k)
        row.append(f"{a:7.2f}→{b:7.2f} {((b - a) / a * 100 if a else 0):+4.0f}%")
        out.setdefault(sc, {})[k] = [round(a, 2), round(b, 2)]
    print(f'{sc:10s} ' + ' '.join(f'{x:>20s}' for x in row))
json.dump(out, open('tests/out/deko_compare.json', 'w'), indent=1)
