import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS)
    ctx = b.new_context(**PIXEL7)
    pg = ctx.new_page(); logs = []
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text))
    pg.on('framenavigated', lambda f: logs.append('NAV ' + f.url))
    pg.goto(BASE + 'index.html')
    for i in range(12):
        time.sleep(2)
        try: print(pg.evaluate("JSON.stringify({app: !!window.__app, fr: window.__app && window.__app.frames, ctl: !!navigator.serviceWorker.controller, err: window.__errors})"))
        except Exception as e: print('nav')
    print('\n'.join(l for l in logs if 'GL Driver' not in l)[:3000])
    b.close()
