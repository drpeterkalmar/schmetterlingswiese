import time, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title')
    s.pg.fill('input.name', 'Testkind'); s.tap('[data-a=create]')
    time.sleep(2)
    time.sleep(3); s.shot('d_map')
    print(s.ev("JSON.stringify(__game.info())"))
    s.close()
