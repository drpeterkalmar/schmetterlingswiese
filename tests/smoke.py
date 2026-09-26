import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    time.sleep(1.5); s.shot('s01_title')
    print('ac before tap', s.ev("__game.ac()"))
    s.tap('#title')
    print('ac after tap', s.ev("__game.ac()"), 'screen', s.ev("__app.ui.current"))
    s.pg.fill('input.name', 'Testkind'); s.tap('[data-a=create]')
    time.sleep(1); s.shot('s02_map')
    s.tap('[data-a=level][data-v="1-1"]'); time.sleep(0.8); s.shot('s03_card')
    s.tap('[data-a=go]'); time.sleep(2); s.shot('s04_play')
    print(s.state())
    for i in range(40):
        s.ev("__game.step()"); time.sleep(0.25)
        st = json.loads(s.state())
        if st['game'] == 'won': break
    time.sleep(0.5); s.shot('s05_won')
    time.sleep(2.5); s.shot('s06_result')
    print(s.state())
    print('errors', s.errors[:20])
    print('\n'.join(s.console[:30]))
    s.close()
