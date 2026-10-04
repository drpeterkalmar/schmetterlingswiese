# Schreibt sw.js neu: Precache-Liste aller Spieldateien + Inhalts-Hash als Version (Cache-Busting).
# Nach jeder Änderung an Spieldateien ausführen: python3 tools/update_sw.py
import hashlib, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['index.html', 'manifest.webmanifest', 'css/style.css']
for d in ['js', 'lib', 'icons']:
    for dp, dn, fn in os.walk(os.path.join(ROOT, d)):
        for f in sorted(fn):
            if f.endswith(('.js', '.png', '.css')) and not f.startswith('.'):
                files.append(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, '/'))  # auch unter Windows „/“
files = sorted(set(files))
h = hashlib.sha256()
for f in files:
    if f == 'js/build.js': continue  # enthält selbst die Version
    h.update(f.encode()); h.update(open(os.path.join(ROOT, f), 'rb').read())
ver = h.hexdigest()[:10]
# UTF-8 und LF ausdrücklich (gleiches Ergebnis auf Mac und Windows)
tpl = open(os.path.join(ROOT, 'tools', 'sw.template.js'), encoding='utf-8').read()
out = tpl.replace('__VERSION__', ver).replace('__ASSETS__', ',\n  '.join("'" + f + "'" for f in files))
open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8', newline='\n').write(out)
# Version auch im Spiel anzeigen
mj = os.path.join(ROOT, 'js', 'build.js')
open(mj, 'w', encoding='utf-8', newline='\n').write(f"export const BUILD = '{ver}';\n")
print('sw.js Version', ver, len(files), 'Dateien')
