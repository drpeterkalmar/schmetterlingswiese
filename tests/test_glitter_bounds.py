# Regression: Der Glitzerstern muss im Spielfeld liegen (Spielergrenze player.bounds = 108 m).
# Bug 27.09.2026: 60 % der Sterne hängen an einem zufälligen Baum; Bäume stehen aber bis 150 m (Hügelrand)
# → Stern außerhalb des Spielfelds, teils hinter der harten Grenze (bounds + 22 = 130 m) gar nicht erreichbar.
# Server: python3 tools/serve.py (mehrfädig; der Standard-http.server wirft ERR_CONNECTION_RESET)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *

LIMIT = 95  # Sicherheitsabstand zur Grenze 108 (Hügelrand ab ~115 m)
res = {'levels': 0, 'outside': [], 'not_collected': [], 'r': []}
failed = []
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.pg.on('requestfailed', lambda r: failed.append(f"{r.url} {r.failure}"))
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'G'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)")
    for lid in s.ev("__game.levels()"):
        for diff in ('leicht', 'mittel'):
            # alte Instanz merken: start() baut asynchron auf, sonst misst man den Stern des Vorgänger-Levels
            s.ev("window.__oldG = __app.game.glitter")
            s.ev(f"__game.start('{lid}', '{diff}')")
            s.pg.wait_for_function("__app.game && __app.game.glitter && __app.game.glitter !== window.__oldG"
                                   " && __app.game.state === 'play'", timeout=60000)
            r = s.ev("(() => { const p = __app.game.glitter.pos; return Math.hypot(p.x, p.z); })()")
            key = f"{lid}/{diff}"
            res['levels'] += 1; res['r'].append(round(r, 1))
            if r > LIMIT: res['outside'].append({key: round(r, 1)})
            # Erreichbar? Spieler bis zu 4 s lang immer wieder auf den Stern setzen (Headless-Frames sind
            # langsam). Die harte Grenze (130 m) schiebt ihn jeden Frame zurück → Stern dort nie erreichbar.
            s.ev("__app.input.injected = {turn: 0, climb: 0}")
            got = False
            for _ in range(40):
                s.ev("(() => { const p = __app.game.glitter.pos; __app.player.pos.set(p.x, p.y, p.z); })()")
                time.sleep(0.1)
                if s.ev("__app.game.glitter.found"): got = True; break
            if not got: res['not_collected'].append(key)
            s.ev("__app.input.injected = null")
    s.shot('glitter_bounds')
    res['errors'] = s.errors[:5]
    s.close()
res['max_r'] = max(res['r']); res['min_r'] = min(res['r']); del res['r']
res['requestfailed'] = failed[:8]
res['ok'] = res['levels'] > 0 and not res['outside'] and not res['not_collected'] and not res['errors']
print(json.dumps(res, indent=1))
print('RESULT', 'PASS' if res['ok'] else 'FAIL')
sys.exit(0 if res['ok'] else 1)
