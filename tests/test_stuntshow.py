# 🎪 Zufalls-Stunt-Knopf (v2.3): jede Einlage einzeln (Bahn, Bodenabstand, Rückkehr auf die Fluglinie, Winkel-Reset,
# keine Aufgaben-Zählung, Figur im Bild) + Knopf-Verhalten (Zufall ohne Wiederholung, Abklingzeit, laufende Einlage,
# am Boden, Taste C, Sieg/Finale gesperrt, URL-Override, Knopfgröße/Lage hoch + quer) + Burst-Aufnahmen je Einlage.
# v2.5: jede Einlage zusätzlich mit Start beim Lenken (und mit gehaltener Taste), knapp über dem Boden, direkt nach dem
# Abheben und im Riesen-Modus → Flugrichtung danach unverändert (< 0,02 rad), Seitenversatz < 0,6 m.
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/stuntshow'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
res = {'stunts': {}, 'button': {}}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def setup(s, q=''):
    s.open('?nosw' + q); s.tap('#title'); s.pg.fill('input.name', 'Stunt'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)

def place(s, alt=3.2):
    # an einen ruhigen Startpunkt (Level-Start, Blick zur Mitte), geradeaus, Kamera neu
    s.ev(f"""(() => {{ const g = __app.game, p = __app.player; p.stunt = null; p.landed = false; p.hover = false;
      p.pos.copy(g.spawn); p.pos.y = __H(p.pos.x, p.pos.z) + {alt}; p.yaw = g.spawnYaw; p.yawRate = 0; p.pitch = 0; p.ext.set(0, 0, 0);
      p.camInit = false; __app.input.injected = {{turn: 0, climb: 0}}; }})()""")
    sim_wait(s, 0.7)

REC = """(() => { window.__rec = []; window.__recOn = true;
  (function f() { if (!window.__recOn) return; if (!window.__freeze) { const p = __app.player, q = p.critter.tilt.quaternion, S = p.stunt;
    __rec.push([__app.t, p.pos.x, p.pos.y, p.pos.z, __H(p.pos.x, p.pos.z), S && S.type === 'show' ? S.p : -1, q.x, q.y, q.z, q.w,
      p.critter.tilt.rotation.x, p.critter.tilt.rotation.z, p.yaw]); } requestAnimationFrame(f); })(); })()"""

def run_stunt(s, i, sid, dur, name=None):
    name = name or sid
    place(s)
    st0 = s.ev("JSON.stringify(__app.progress.cur.stats)")
    tasks0 = s.ev("__app.game.tasks.map(t => t.cur).join(',')")
    time0 = s.ev("__app.game.time")
    s.ev(REC)
    p0 = s.ev("[__app.player.pos.x, __app.player.pos.y, __app.player.pos.z, __app.player.yaw]")
    ok = s.ev(f"__game.stunt({i})")
    started = s.ev("__app.player.stunt && __app.player.stunt.id")
    # Burst: 6 Bilder über die ganze Einlage (Abstand = Dauer/6 in Simzeit, 0,25–0,47 s)
    t0 = s.ev("__app.t"); k = 0; view = []
    gap = dur / 6.0
    while k < 6:
        if s.ev("__app.t") - t0 >= 0.08 + k * gap:
            s.ev("__game.freeze(true)")
            s.pg.screenshot(path=f'{OUT}/{name}_{k}.png')
            v = s.ev("""(() => { const p = __app.player.pos.clone().project(__app.camera); return [p.x, p.y, p.z]; })()""")
            view.append([round(v[0], 2), round(v[1], 2)])
            s.ev("__game.freeze(false)"); k += 1
        time.sleep(0.01)
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 20: time.sleep(0.02)
    end_state = s.ev("""(() => { const c = __app.player.critter.tilt; return [c.rotation.x, c.rotation.y, c.rotation.z, __app.player.pos.x, __app.player.pos.y, __app.player.pos.z, __app.player.yaw]; })()""")
    sim_wait(s, 0.5)
    s.ev("window.__recOn = false")
    rec = s.ev("__rec")
    st1 = s.ev("JSON.stringify(__app.progress.cur.stats)")
    time1 = s.ev("__app.game.time")
    during = [r for r in rec if r[5] >= 0]
    after = [r for r in rec if r[5] < 0 and r[0] > (during[-1][0] if during else 0)]
    yaw = p0[3]; fx, fz, rx, rz = math.sin(yaw), math.cos(yaw), math.cos(yaw), -math.sin(yaw)
    ex, ey, ez = end_state[3] - p0[0], end_state[4] - p0[1], end_state[5] - p0[2]
    clear = [r[2] - r[4] for r in during]
    clear_main = [r[2] - r[4] for r in during if r[5] > 0.35]
    # Winkel nach dem Ende: Figur waagrecht, kein Nachwackeln (Eingabe neutral)
    wob = max([max(abs(r[10]), abs(r[11])) for r in after] or [0])
    q_end = [abs(r[6]) + abs(r[7]) + abs(r[8]) for r in after[:2]]
    # Bahn-Tempo (min) als Kontrolle, dass keine Spitze/Stillstand in der Bahn liegt
    sp = []
    for a, b in zip(during, during[1:]):
        dt = b[0] - a[0]
        if dt > 1e-4: sp.append(math.dist(a[1:4], b[1:4]) / dt)
    r = {
        'ok_start': bool(ok) and started == sid, 'frames': len(during),
        'min_clear': round(min(clear), 2) if clear else None, 'min_clear_main': round(min(clear_main), 2) if clear_main else None,
        'end_lateral': round(ex * rx + ez * rz, 2), 'end_forward': round(ex * fx + ez * fz, 1), 'end_up': round(ey, 2),
        'yaw_change': round(end_state[6] - yaw, 3), 'end_rot': [round(x, 3) for x in end_state[:3]], 'q_after': [round(x, 3) for x in q_end],
        'wobble_after': round(wob, 3), 'view': view, 'in_view': all(abs(x) < 0.95 and abs(y) < 0.95 for x, y in view),
        'stats_unchanged': st0 == st1, 'tasks_unchanged': tasks0 == s.ev("__app.game.tasks.map(t => t.cur).join(',')"),
        'time_runs': round(time1 - time0, 2), 'min_speed': round(min(sp), 2) if sp else None, 'max_speed': round(max(sp), 1) if sp else None,
    }
    r['ok'] = (r['ok_start'] and r['min_clear'] is not None and r['min_clear'] > 0.8 and (r['min_clear_main'] or 9) >= 2.3
               and abs(r['end_lateral']) < 0.6 and abs(r['yaw_change']) < 0.02 and max(abs(x) for x in r['end_rot']) < 0.02
               and r['wobble_after'] < 0.12 and r['in_view'] and r['stats_unchanged'] and r['time_runs'] > dur * 0.9)
    return r

# v2.5: Richtung bleibt auch in Sonderfällen (Start beim Lenken, knapp über dem Boden, direkt nach dem Abheben, Riese)
def run_case(s, i, sid, dur, case):
    hold = case == 'lenkt_halten'
    if case == 'riese': s.ev("__app.player.setCharacter('schmetterling', {size: 'xl'})")
    place(s, 1.0 if case == 'boden' else 3.2)
    if case in ('lenkt', 'lenkt_halten'):
        s.ev("__app.input.injected = {turn: 1, climb: 0}"); sim_wait(s, 0.8)
    if case == 'abheben':
        s.ev("__app.player.land(null)"); sim_wait(s, 0.5)
        s.ev("__app.input.injected = {turn: 0, climb: 1}")
        t1 = time.time()
        while s.ev("__app.player.landed") and time.time() - t1 < 5: time.sleep(0.01)
    s.ev(REC)
    r0 = s.ev(f"""(() => {{ const p = __app.player, y = p.yaw, yr = p.yawRate, pos = p.pos.toArray(), air = p.airT, ok = __game.stunt({i});
      __app.input.injected = {{turn: {1 if hold else 0}, climb: 0}};
      return {{ yaw: y, yawRate: yr, pos, air, ok, gh: __H(pos[0], pos[2]) }}; }})()""")
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 20: time.sleep(0.01)
    yaw_end = s.ev("__app.player.yaw")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    sim_wait(s, 0.5)
    s.ev("window.__recOn = false")
    rec = s.ev("__rec")
    e = s.ev("(() => { const p = __app.player, c = p.critter.tilt.rotation; return [p.pos.x, p.pos.y, p.pos.z, p.yaw, c.x, c.y, c.z]; })()")
    during = [r for r in rec if r[5] >= 0]
    yaw = r0['yaw']; rx, rz = math.cos(yaw), -math.sin(yaw)
    if hold and during: yaw_end = during[-1][12]; e[:3] = during[-1][1:4]  # Taste gehalten: bildgenau am letzten Einlagen-Bild
    lat = (e[0] - r0['pos'][0]) * rx + (e[2] - r0['pos'][2]) * rz
    r = {'start_ok': bool(r0['ok']), 'yawRate_start': round(r0['yawRate'], 2), 'alt_start': round(r0['pos'][1] - r0['gh'], 2),
         'air_start': round(r0['air'], 2) if case == 'abheben' else None,
         'yaw_change_show': round(math.atan2(math.sin(yaw_end - yaw), math.cos(yaw_end - yaw)), 4),
         'yaw_change': round(math.atan2(math.sin(e[3] - yaw), math.cos(e[3] - yaw)), 4) if not hold else None,
         'lateral': round(lat, 2), 'end_rot': round(max(abs(e[4]), abs(e[5]), abs(e[6])), 3),
         'min_clear': round(min(r[2] - r[4] for r in during), 2) if during else None}
    r['ok'] = (r['start_ok'] and abs(r['yaw_change_show']) < 0.02 and (hold or abs(r['yaw_change']) < 0.02) and abs(r['lateral']) < 0.6
               and (r['min_clear'] or 0) > 0.5 and (hold or r['end_rot'] < 0.12))
    if case == 'lenkt': r['ok'] = r['ok'] and abs(r['yawRate_start']) > 0.5
    if case == 'abheben': r['ok'] = r['ok'] and r['air_start'] is not None and r['air_start'] < 0.2
    if case == 'riese': s.ev("__app.player.setCharacter('schmetterling', {size: 'm'})")
    return r

def grid(sid):
    try:
        from PIL import Image
        ims = [Image.open(f'{OUT}/{sid}_{k}.png') for k in range(6)]
        w, h = ims[0].size; sc = 0.5
        out = Image.new('RGB', (int(w * sc) * 6, int(h * sc)))
        for k, im in enumerate(ims): out.paste(im.resize((int(w * sc), int(h * sc))), (k * int(w * sc), 0))
        out.save(f'{OUT}/{sid}_grid.jpg', quality=82)
    except Exception as e:
        print('grid', e)

def tap_show(s):
    box = s.pg.locator('#bShow').bounding_box()
    s.pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)

def wait_ready(s, t=15):
    t1 = time.time()
    while not s.ev("__app.game.showReady()") and time.time() - t1 < t: time.sleep(0.03)

def btn_geom(s):
    return s.ev("""(() => { const b = document.getElementById('bShow').getBoundingClientRect(), cs = getComputedStyle(document.getElementById('bShow'));
      const rects = [...document.querySelectorAll('#zones .z, #bPause, #tasks, #timer')].map(e => [e.className || e.id, e.getBoundingClientRect()]);
      const hit = rects.filter(([n, r]) => r.width && !(b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom)).map(([n]) => n);
      return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.left), y: Math.round(b.top), inView: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
        display: cs.display, overlaps: hit }; })()""")

with sync_playwright() as pw:
    s = Session(pw, dpr=1.5)
    setup(s)
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    stunts = s.ev("__game.stunts()")
    res['n_stunts'] = len(stunts)
    for i, d in enumerate(stunts):
        r = run_stunt(s, i, d['id'], d['dur'])
        res['stunts'][d['id']] = r
        grid(d['id'])
        print(d['id'], 'ok' if r['ok'] else 'FEHLER', json.dumps({k: r[k] for k in ['min_clear', 'min_clear_main', 'end_lateral', 'end_forward', 'end_up', 'yaw_change', 'wobble_after', 'in_view', 'stats_unchanged', 'min_speed']}), flush=True)
    # --- v2.5 Sonderfälle: Flugrichtung bleibt (Start beim Lenken / Taste gehalten, knapp über dem Boden, nach dem Abheben, Riese)
    res['cases'] = {}
    for case in ['lenkt', 'lenkt_halten', 'boden', 'abheben', 'riese']:
        for i, d in enumerate(stunts):
            r = run_case(s, i, d['id'], d['dur'], case)
            res['cases'][f"{case}_{d['id']}"] = r
            if not r['ok']: print('fall', case, d['id'], 'FEHLER', json.dumps(r), flush=True)
        cs = [v for k, v in res['cases'].items() if k.startswith(case + '_')]
        print('fall', case, 'ok' if all(c['ok'] for c in cs) else 'FEHLER', json.dumps({
            'max_yaw_change': max(abs(c['yaw_change'] or c['yaw_change_show']) for c in cs), 'max_lateral': max(abs(c['lateral']) for c in cs),
            'min_clear': min(c['min_clear'] for c in cs), 'yawRate_start': max(abs(c['yawRate_start']) for c in cs)}), flush=True)
    # --- Welt-Varianten des Wirbels (Kirschhain: Blütenwirbel, Abend: Glühwürmchen-Wirbel) + Doppel-Looping am Abend
    res['variants'] = {}
    for lid, wid in [('4-1', 'kirsch'), ('5-1', 'abend')]:
        s.ev(f"__game.start('{lid}', 'leicht')"); sim_wait(s, 1.0)
        for sid in ['wirbel', 'doppel']:
            d = next(x for x in stunts if x['id'] == sid)
            r = run_stunt(s, [x['id'] for x in stunts].index(sid), sid, d['dur'], f'{wid}_{sid}')
            if not r['ok']: print('variante', wid, sid, json.dumps(r), flush=True)
            res['variants'][f'{wid}_{sid}'] = r['ok']
            grid(f'{wid}_{sid}')
        res['variants'][wid + '_name'] = s.ev("document.getElementById('toast').textContent")
    print('varianten', res['variants'], flush=True)
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    # --- Knopf: 10 × echt tippen (Zufall ohne direkte Wiederholung)
    B = res['button']
    B['geom_P'] = btn_geom(s)
    s.ev("__app.game.showLog = []")  # Liste hält max. 60 Einträge – nach den Sonderfällen voll
    log0 = s.ev("__app.game.showLog.length")
    for k in range(10):
        place(s); wait_ready(s)
        tap_show(s)
        sim_wait(s, 0.15)
    seq = s.ev(f"__app.game.showLog.slice({log0})")
    B['random_seq'] = seq
    B['no_repeat'] = len(seq) == 10 and all(a != b for a, b in zip(seq, seq[1:]))
    B['distinct'] = len(set(seq))
    # --- Abklingzeit: direkt nach Ende nochmal tippen → nichts; nach Ablauf → Einlage
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    place(s); wait_ready(s)
    tap_show(s); sim_wait(s, 0.1)
    n1 = s.ev("__app.game.showLog.length")
    B['cd_ring_visible'] = s.ev("!document.getElementById('bShow').classList.contains('ready')")
    tap_show(s); sim_wait(s, 0.1)  # während der laufenden Einlage
    B['ignored_while_running'] = s.ev("__app.game.showLog.length") == n1
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    B['cd_left_after_end'] = round(4 - (s.ev("__app.game.time - __app.game.showAt")), 2)
    tap_show(s); sim_wait(s, 0.1)
    B['cooldown_blocks'] = s.ev("__app.game.showLog.length") == n1 and not s.ev("!!__app.player.stunt")
    wait_ready(s); place(s); tap_show(s); sim_wait(s, 0.1)
    B['after_cooldown'] = s.ev("__app.game.showLog.length") == n1 + 1
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    # --- Taste C
    place(s); wait_ready(s)
    s.pg.keyboard.press('c'); sim_wait(s, 0.15)
    B['key_c'] = s.ev("!!(__app.player.stunt && __app.player.stunt.type === 'show')")
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    # --- Am Boden: erst abheben, dann Einlage
    place(s); wait_ready(s)
    s.ev("__app.player.land(null)"); sim_wait(s, 0.4)
    landed = s.ev("__app.player.landed")
    tap_show(s); sim_wait(s, 0.3)
    B['from_ground'] = landed and s.ev("!__app.player.landed && !!(__app.player.stunt && __app.player.stunt.type === 'show')")
    s.ev(REC)
    t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    s.ev("window.__recOn = false")
    rec = s.ev("__rec")
    B['from_ground_min_clear'] = round(min(r[2] - r[4] for r in rec if r[5] >= 0), 2) if any(r[5] >= 0 for r in rec) else None
    # --- Sieg/Finale: Knopf weg, Taste/Aufruf wirkungslos, Sieger-Looping läuft unverändert
    for k in range(20):
        if s.ev("__app.game.tasks[0].max - __app.game.tasks[0].cur") <= 1: break
        s.ev("__game.step()"); sim_wait(s, 0.05)
    s.ev("__game.step()")
    t1 = time.time()
    while s.ev("__app.game.state") != 'won' and time.time() - t1 < 20: time.sleep(0.03)
    sim_wait(s, 0.3)
    grand = s.ev("!!(__app.player.stunt && __app.player.stunt.grand)")
    s.pg.keyboard.press('c'); sim_wait(s, 0.1)
    B['won_blocked'] = (s.ev("__app.game.state") == 'won' and grand and s.ev("!!(__app.player.stunt && __app.player.stunt.grand)")
                        and s.ev("__game.stunt(0, true)") is False and btn_geom(s)['display'] == 'none')
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 30: time.sleep(0.2)
    B['won_blocked_after_finale'] = s.ev("__game.stunt(0, true)") is False
    res['errors'] = list(s.errors[:5])
    s.close()
    # --- URL-Override + Querformat (Knopf-Lage, Einlage im Bild)
    s = Session(pw, device=PIXEL7_LAND, dpr=1.5)
    setup(s, '&stunt=rakete')
    s.ev("__game.start('3-1', 'leicht')"); sim_wait(s, 1.0)
    res['button']['geom_L'] = btn_geom(s)
    ids = []
    for k in range(2):
        place(s); wait_ready(s); tap_show(s); sim_wait(s, 0.15)
        ids.append(s.ev("__app.player.stunt && __app.player.stunt.id"))
        if k == 0:
            t0 = s.ev("__app.t")
            for j in range(3):
                while s.ev("__app.t") - t0 < 0.5 + j * 0.7: time.sleep(0.02)
                s.ev("__game.freeze(true)"); s.pg.screenshot(path=f'{OUT}/quer_rakete_{j}.png'); s.ev("__game.freeze(false)")
        t1 = time.time()
        while s.ev("!!__app.player.stunt") and time.time() - t1 < 10: time.sleep(0.02)
    res['button']['url_override'] = ids
    res['errors'] += s.errors[:5]
    s.close()

B = res['button']
geo_ok = all(g['w'] >= 48 and g['h'] >= 48 and g['inView'] and not g['overlaps'] and g['display'] != 'none' for g in [B['geom_P'], B['geom_L']])
res['ok'] = (res['n_stunts'] >= 8 and all(r['ok'] for r in res['stunts'].values()) and B['no_repeat'] and B['distinct'] >= 5
             and len(res['cases']) == 5 * res['n_stunts'] and all(r['ok'] for r in res['cases'].values())
             and all(v for k, v in res['variants'].items() if not k.endswith('_name'))
             and B['ignored_while_running'] and B['cooldown_blocks'] and B['after_cooldown'] and B['key_c'] and B['from_ground']
             and (B['from_ground_min_clear'] or 0) > 0.3 and B['won_blocked'] and B['won_blocked_after_finale'] and B['cd_ring_visible']
             and B['url_override'] == ['rakete', 'rakete'] and geo_ok and not res['errors'])
json.dump(res, open('tests/out/stuntshow.json', 'w'), indent=1)
print(json.dumps(res['button'], indent=1))
print('errors', res['errors'])
print('ok', res['ok'])
