# Automatische Kunststücke: Freuden-Schraube bei jedem Teilziel, Sieger-Looping beim Levelsieg (Messung + Burst-Screenshots)
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
os.makedirs('tests/shots/celebrate', exist_ok=True)
res = {}

def frames(s): return s.ev("__app.frames")
def wait_frames(s, n=2, timeout=20):
    f0 = frames(s); t0 = time.time()
    while frames(s) < f0 + n and time.time() - t0 < timeout: time.sleep(0.03)

with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'C'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(1.2)
    s.ev("__app.player.pos.y += 3")
    # 1) Teilziel → Schraube: Körper dreht sich, Flugrichtung/Steuerung unverändert
    yaw0 = s.ev("__app.player.yaw")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    # echt in einen Tropfen fliegen (kein Teleport → Kamera bleibt dran)
    s.ev("""(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken), p = __app.player;
      const yaw = p.yaw; p.pos.set(it.pos.x - Math.sin(yaw) * 7, it.pos.y, it.pos.z - Math.cos(yaw) * 7); p.pitch = 0; p.camInit = false; })()""")
    t1 = time.time()
    while s.ev("__app.game.tasks[0].cur") < 1 and time.time() - t1 < 20: time.sleep(0.03)
    t0 = s.ev("__app.t"); k = 0; maxAng = 0; stunt_during = False
    while k < 6:
        if s.ev("__app.t") - t0 >= k * 0.12:
            s.ev("__game.freeze(true)"); s.shot(f'celebrate/roll_{k}')
            a = s.ev("__app.player.critter.rollAng"); maxAng = max(maxAng, abs(a))
            stunt_during |= s.ev("!!__app.player.stunt")
            s.ev("__game.freeze(false)"); k += 1
        time.sleep(0.02)
    ts = s.ev("__app.t")
    while s.ev("__app.t") - ts < 1.6: time.sleep(0.05)  # Simzeit (headless läuft langsamer als Echtzeit)
    res['roll'] = {'maxAng': round(maxAng, 2), 'settled': s.ev("__app.player.critter.rollAng === 0 && __app.player.critter.rollTarget === 0"),
                   'no_flight_stunt': not stunt_during, 'cur': s.ev("__app.game.tasks[0].cur"), 'rolls_stat': s.ev("__app.progress.cur.stats.rolls || 0")}
    # Steuerung während der Schraube: links lenken wirkt
    s.ev("__app.input.injected = {turn: -1, climb: 0}"); s.ev("__game.step()")
    y1 = s.ev("__app.player.yaw"); time.sleep(0.6); y2 = s.ev("__app.player.yaw")
    res['steer_during_roll'] = round(y2 - y1, 3)
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    # Kombo-Spam: Schraube stapelt, aber max ~2,6 Umdrehungen
    for i in range(3): s.ev("__game.step()"); wait_frames(s, 1)
    res['roll_cap_turns'] = round(s.ev("Math.abs(__app.player.critter.rollTarget - __app.player.critter.rollAng) / (2*Math.PI)"), 2)
    time.sleep(2)
    # 2) Letztes Ziel → Sieger-Looping. Bis auf 1 Tropfen per step(), den letzten ECHT anfliegen
    #    (step() teleportiert – die Kamera hinge dann hinterher, das wäre ein Test-Artefakt).
    for i in range(20):
        if s.ev("__app.game.tasks[0].max - __app.game.tasks[0].cur") <= 1: break
        s.ev("__game.step()"); wait_frames(s, 2)
    s.ev("""(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken), p = __app.player;
      const yaw = p.yaw; p.pos.set(it.pos.x - Math.sin(yaw) * 9, it.pos.y, it.pos.z - Math.cos(yaw) * 9); p.pitch = 0; })()""")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    t1 = time.time()
    while json.loads(s.state())['game'] != 'won' and time.time() - t1 < 20: time.sleep(0.05)
    st = json.loads(s.state())
    res['won'] = st['game'] == 'won'
    res['finale_loop'] = s.ev("!!(__app.player.stunt && __app.player.stunt.grand)")
    t0 = s.ev("__app.t"); k = 0; minScreenY = 1; maxRot = 0
    while k < 8:
        if s.ev("__app.t") - t0 >= k * 0.3:
            s.ev("__game.freeze(true)"); s.shot(f'celebrate/finale_{k}')
            v = s.ev("(() => { const p = __app.player.pos.clone().project(__app.camera); return [p.x, p.y, Math.abs(__app.player.critter.tilt.rotation.x)]; })()")
            maxRot = max(maxRot, v[2])
            res.setdefault('finale_screen', []).append([round(v[0], 2), round(v[1], 2)])
            s.ev("__game.freeze(false)"); k += 1
        time.sleep(0.02)
    res['finale_max_pitch'] = round(maxRot, 2)
    res['in_view'] = all(abs(x) < 0.95 and abs(y) < 0.95 for x, y in res['finale_screen'])
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 30: time.sleep(0.2)
    res['result_after_s'] = round(s.ev("__app.game.wonT"), 2)
    res['result_shown'] = s.ev("__app.ui.current") == 'result'
    res['loops_stat'] = s.ev("__app.progress.cur.stats.loops || 0")
    time.sleep(1); s.shot('celebrate/result')
    # 3) Landen als letzte Aufgabe (2-1) → Finale startet trotzdem (vom Boden weg)
    s.ev("__game.start('2-1', 'leicht')"); time.sleep(1)
    for i in range(40):
        if json.loads(s.state())['game'] == 'won': break
        s.ev("__game.step()"); wait_frames(s, 2)
        if s.ev("__app.game.tasks.every(t => t.done)"): break
    time.sleep(0.4)
    res['land_level'] = {'state': json.loads(s.state())['game'], 'finale': s.ev("!!__app.game.finale"), 'landed': s.ev("__app.player.landed")}
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 30: time.sleep(0.2)
    res['land_level']['result'] = s.ev("__app.ui.current")
    res['errors'] = s.errors[:5]
    s.close()
r = res
res['ok'] = (r['roll']['maxAng'] > 3 and r['roll']['settled'] and r['roll']['no_flight_stunt'] and abs(r['steer_during_roll']) > 0.15
             and r['roll_cap_turns'] <= 2.7 and r['won'] and r['finale_loop'] and r['finale_max_pitch'] > 2 and r['in_view']
             and r['result_shown'] and r['land_level']['result'] == 'result' and not r['errors'])
print(json.dumps(res, indent=1))
