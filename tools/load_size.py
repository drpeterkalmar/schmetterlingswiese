# Ladegröße: alle Dateien aus der Precache-Liste von sw.js (= alles, was das Spiel lädt) roh und gzip (Stufe 9).
# Aufruf: python3 tools/load_size.py [Ordner]   (Standard: Projektordner)
import gzip, os, re, sys, json
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
files = sorted(set(re.findall(r"'([^']+\.(?:js|css|html|png|webmanifest))'", sw)) | {'sw.js'})
raw = gz = 0; per = {}
for f in files:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p): continue
    b = open(p, 'rb').read()
    g = len(gzip.compress(b, 9))
    raw += len(b); gz += g; per[f] = g
top = sorted(per.items(), key=lambda kv: -kv[1])[:6]
print(json.dumps({'files': len(per), 'raw_kb': round(raw / 1024, 1), 'gzip_kb': round(gz / 1024, 1), 'top_gzip_kb': {k: round(v / 1024, 1) for k, v in top}}, ensure_ascii=False))
