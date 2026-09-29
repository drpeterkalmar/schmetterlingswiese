# Automatische Kunststücke: Freuden-Schraube bei jedem Teilziel, Sieger-Looping beim Levelsieg (Messung + Burst-Screenshots)
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
os.makedirs('tests/shots/celebrate', exist_ok=True); os.makedirs('tests/shots/v24', exist_ok=True)
res = {}

def frames(s): return s.ev("__app.frames")
def wait_frames(s, n=2, timeout=20):
    f0 = frames(s); t0 = time.time()
    while frames(s) < f0 + n and time.time() - t0 < timeout: time.sleep(0.03)


def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

REC = """(() => { window.__rec = []; window.__recOn = true;
  (function f() { if (!window.__recOn) return; if (!window.__freeze) { const p = __app.player, S = p.stunt, v = p.pos.clone().project(__app.camera);
    __rec.push([__app.t, p.pos.y - __H(p.pos.x, p.pos.z), S && S.grand ? S.p : -1, v.x, v.y, v.z, __app.timeScale]); } requestAnimationFrame(f); })(); })()"""

def grid(name):
    try:
        from PIL import Image
        ims = [Image.open(f'tests/shots/{name}_{k}.png') for k in range(6)]
        w, h = ims[0].size; sc = 0.5
        out = Image.new('RGB', (int(w * sc) * 6, int(h * sc)))
        for k, im in enumerate(ims): out.paste(im.resize((int(w * sc), int(h * sc))), (k * int(w * sc), 0))
        out.save(f'tests/shots/{name}_grid.jpg', quality=82)
    except Exception as e:
        print('grid', e)

# Level 1-1 bis auf den letzten Tropfen, den letzten echt anfliegen → Sieg → Sieger-Einlage messen
def run_finale(s, fid, shots):
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    s.ev("__app.player.pos.y += 3")
    for i in range(20):
        if s.ev("__app.game.tasks[0].max - __app.game.tasks[0].cur") <= 1: break
        s.ev("__game.step()"); wait_frames(s, 2)
    s.ev("""(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken), p = __app.player;
      const yaw = p.yaw; p.pos.set(it.pos.x - Math.sin(yaw) * 9, it.pos.y, it.pos.z - Math.cos(yaw) * 9); p.pitch = 0; })()""")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    s.ev(REC)
    t1 = time.time()
    while s.ev("__app.game.state") != 'won' and time.time() - t1 < 20: time.sleep(0.03)
    r = {'won': s.ev("__app.game.state") == 'won'}
    r['id'] = s.ev("__app.game.finale && __app.game.finale.id")
    r['show'] = s.ev("!!(__app.player.stunt && __app.player.stunt.type === 'show' && __app.player.stunt.grand)")
    hi = s.ev("__app.player.stunt ? __app.player.stunt.def.hi : 0.5")
    # Burst 6 × 160 ms (Simzeit), Start kurz vor dem Höhepunkt
    t1 = time.time()
    while s.ev("__app.player.stunt && __app.player.stunt.p < %f" % max(0, hi - 0.12)) and time.time() - t1 < 20: time.sleep(0.01)
    t0 = s.ev("__app.t"); k = 0; view = []
    while k < 6 and time.time() - t1 < 30:
        if s.ev("__app.t") - t0 >= k * 0.16:
            s.ev("__game.freeze(true)"); s.shot(f'{shots}_{k}')
            v = s.ev("(() => { const p = __app.player.pos.clone().project(__app.camera); return [p.x, p.y]; })()")
            view.append([round(v[0], 2), round(v[1], 2)])
            s.ev("__game.freeze(false)"); k += 1
        time.sleep(0.01)
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 20: time.sleep(0.02)
    wait_frames(s, 2)
    r['end_rot'] = [round(x, 3) for x in s.ev("(() => { const c = __app.player.critter.tilt; return [c.rotation.x, c.rotation.y, c.rotation.z]; })()")]
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 30: time.sleep(0.1)
    r['result_after_s'] = round(s.ev("__app.game.wonT"), 2)
    r['result_shown'] = s.ev("__app.ui.current") == 'result'
    s.ev("window.__recOn = false"); rec = s.ev("__rec")
    during = [x for x in rec if x[2] >= 0]
    r['frames'] = len(during)
    r['min_clear'] = round(min(x[1] for x in during), 2) if during else None
    r['in_view_frames'] = round(sum(1 for x in during if abs(x[3]) < 0.95 and abs(x[4]) < 0.95 and x[5] < 1) / max(1, len(during)), 3)
    r['slow_min'] = round(min([x[6] for x in rec] or [1]), 2)
    r['apex'] = s.ev("!!(__app.game.finale && __app.game.finale.apex)")
    r['burst_view'] = view
    r['ok'] = (r['won'] and r['show'] and (fid is None or r['id'] == fid) and r['min_clear'] is not None and r['min_clear'] > 1.0
               and max(abs(x) for x in r['end_rot']) < 0.02 and r['in_view_frames'] >= 0.98 and all(abs(x) < 0.95 and abs(y) < 0.95 for x, y in view)
               and r['slow_min'] < 0.5 and r['apex'] and r['result_shown'])
    return r

with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'C'); s.tap('[data-a=create]')
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
    # 2) Letztes Ziel → zufällige Sieger-Einlage (v2.4). Bis auf 1 Tropfen per step(), den letzten ECHT anfliegen
    #    (step() teleportiert – die Kamera hinge dann hinterher, das wäre ein Test-Artefakt).
    s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
    res['random'] = run_finale(s, None, 'celebrate/finale')
    res['result_after_s'] = res['random']['result_after_s']
    res['loops_stat_unchanged'] = s.ev("__app.progress.cur.stats.loops || 0") == 0
    time.sleep(1); s.shot('celebrate/result')
    # 2b) Jede Sieger-Einlage einzeln (Debug-API __game.finale(id)), Burst 6 × 160 ms um den Höhepunkt
    res['finales'] = {}
    for d in s.ev("__game.finales()"):
        s.ev(f"__game.finale('{d['id']}')")
        r = run_finale(s, d['id'], f"v24/finale_{d['id']}")
        res['finales'][d['id']] = r
        grid(f"v24/finale_{d['id']}")
        print(d['id'], 'ok' if r['ok'] else 'FEHLER', json.dumps({k: r[k] for k in ['min_clear', 'end_rot', 'in_view_frames', 'slow_min', 'apex', 'result_after_s']}), flush=True)
    s.ev("__game.finale(null)")
    # 2c) Zufall über mehrere Siege: nie zweimal dieselbe Einlage direkt hintereinander, letzte Einlage im Profil
    seq = []
    for k in range(6):
        s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.8)
        for i in range(30):
            if s.ev("__app.game.state") == 'won': break
            s.ev("__game.step()"); wait_frames(s, 2)
        seq.append(s.ev("__app.game.finale && __app.game.finale.id"))
        res.setdefault('profile_last', []).append(s.ev("__app.progress.cur.lastFinale"))
    res['random_seq'] = seq
    res['no_repeat'] = all(a and a != b for a, b in zip(seq, seq[1:])) and res['profile_last'] == seq
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
    # 4) ?finale=<id> per URL (A/B) + Querformat
    s = Session(pw, device=PIXEL7_LAND, dpr=1)
    s.open('?nosw&finale=bumerang'); s.tap('#title'); s.pg.fill('input.name', 'Q'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
    q = run_finale(s, 'bumerang', 'v24/finale_quer_bumerang'); grid('v24/finale_quer_bumerang')
    res['quer'] = q; res['url_override'] = q['ok']
    res['errors'] += s.errors[:5]
    s.close()
r = res
res['ok'] = (r['roll']['maxAng'] > 3 and r['roll']['settled'] and r['roll']['no_flight_stunt'] and abs(r['steer_during_roll']) > 0.15
             and r['roll_cap_turns'] <= 2.7 and r['random']['ok'] and len(r['finales']) >= 12 and all(f['ok'] for f in r['finales'].values())
             and r['no_repeat'] and r['url_override'] and r['land_level']['finale'] and r['land_level']['result'] == 'result' and not r['errors'])
print(json.dumps(res, indent=1))
