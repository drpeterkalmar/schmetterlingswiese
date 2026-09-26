import sys, json
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS); pg = b.new_page()
    pg.goto(BASE + 'proto_audio.html'); pg.wait_for_function('window.ready')
    print(json.dumps(pg.evaluate('bench()'), indent=1)); b.close()
