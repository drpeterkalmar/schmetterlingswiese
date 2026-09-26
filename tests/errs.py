import time, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.pg.goto(BASE + 'index.html?nosw')
    time.sleep(8)
    print(s.ev("JSON.stringify({e: window.__errors, app: !!window.__app, fr: window.__app && window.__app.frames})"))
    print('\n'.join(s.errors[:20])); print('\n'.join(s.console[:20]))
    s.close()
