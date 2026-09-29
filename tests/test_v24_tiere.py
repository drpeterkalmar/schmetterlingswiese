# v2.4 Bodentiere: Nahaufnahmen jeder Art in 3 Welten (hoch + quer), Blick zum Spieler, Gang-Zyklus, Blinzeln,
# Freuden-Reaktion. Auch gegen den alten Stand nutzbar (BASE=… TAG=vorher) → Vorher/Nachher-Bögen.
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
TAG = os.environ.get('TAG', 'nachher')
OUT = f'tests/shots/v24/tiere_{TAG}'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
NEW = TAG == 'nachher'
# Welt → Level mit den gewünschten Arten
# (nur Level ohne Besuchs-Aufgabe: sonst zeigen die Nahaufnahmen immer die Freuden-Augen)
PLAN = [('1-1', 'wiese', ['baer', 'capy']), ('1-3', 'wiese', ['hase']), ('3-1', 'teich', ['ente', 'capy']), ('4-1', 'kirsch', ['hase', 'baer']), ('5-1', 'abend', ['baer', 'hase'])]
res = {'shots': [], 'look': {}, 'walk': {}, 'blink': {}, 'joy': {}}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def cam_shot(s, idx, name, side=0.7, dist=2.6, h=1.0, look=0.55):
    # Kamera schräg von vorn aufs Tier (Spielschleife eingefroren, gerendert wird weiter)
    s.ev(f"""(() => {{ const a = __app.game.animals.list[{idx}], c = __app.camera, sc = a.scale;
      const yaw = a.yaw + {side}; c.position.set(a.pos.x + Math.sin(yaw) * {dist} * sc, a.pos.y + {h} * sc, a.pos.z + Math.cos(yaw) * {dist} * sc);
      c.fov = c.aspect < 1 ? 62 : 45; c.updateProjectionMatrix(); c.lookAt(a.pos.x, a.pos.y + {look} * sc, a.pos.z);
      document.querySelectorAll('#toast, #hint, .hint, .toast').forEach(e => e.style.visibility = 'hidden'); }})()""")
    time.sleep(0.25)
    s.pg.screenshot(path=f'{OUT}/{name}.png'); res['shots'].append(name)
    s.ev("document.querySelectorAll('#toast, #hint, .hint, .toast').forEach(e => e.style.visibility = '')")

def run(dev, tag):
    s = Session(pw, device=dev, dpr=1.5)
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'Tier'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(2)")
    for lid, wid, kinds in PLAN:
        s.ev(f"__game.start('{lid}', 'leicht')"); sim_wait(s, 1.0)
        s.ev("__app.game.wasps.setup([])")
        for kind in kinds:
            idx = s.ev(f"__app.game.animals.list.findIndex(a => a.kind === '{kind}')")
            if idx < 0: continue
            # Spieler schwebt 4 m schräg vor dem Tier, 1,8 m hoch, schaut zum Tier
            s.ev(f"""(() => {{ const a = __app.game.animals.list[{idx}], p = __app.player; a.tgt = null; a.wait = 99; a.home.copy(a.pos);
              const yaw = a.yaw + 0.6; p.pos.set(a.pos.x + Math.sin(yaw) * 4, a.pos.y + 1.8, a.pos.z + Math.cos(yaw) * 4);
              p.yaw = Math.atan2(a.pos.x - p.pos.x, a.pos.z - p.pos.z); p.hover = true; p.camInit = false; __app.input.injected = {{turn: 0, climb: 0}}; }})()""")
            sim_wait(s, 1.3)
            if NEW:
                v = s.ev(f"""(() => {{ const a = __app.game.animals.list[{idx}], p = __app.player;
                  const want = Math.atan2(p.pos.x - a.pos.x, p.pos.z - a.pos.z); let d = want - (a.yaw + a.hy); d = Math.atan2(Math.sin(d), Math.cos(d));
                  return [a.hy, a.hp, d, a.sleepy]; }})()""")
                res['look'][f'{wid}_{kind}'] = {'head_yaw': round(v[0], 2), 'head_pitch': round(v[1], 2), 'rest_err': round(v[2], 2), 'sleepy': v[3]}
            if NEW: s.ev(f"(() => {{ const a = __app.game.animals.list[{idx}]; a.blinkT = 9; a.blink = 0; }})()"); sim_wait(s, 0.1)  # kein Zufalls-Blinzeln im Standbild
            s.ev("__game.freeze(true)")
            cam_shot(s, idx, f'{tag}_{wid}_{kind}_nah', side=0.35)
            cam_shot(s, idx, f'{tag}_{wid}_{kind}_seite', side=1.25, dist=3.0, h=0.8)
            s.ev("__game.freeze(false)")
            if NEW and tag == 'hoch' and wid in ('wiese', 'teich'):
                # Gang: Spieler weit weg, Tier läuft zu einem Ziel 5 m voraus; Beinweite + Seitenbild im Schritt
                s.ev(f"""(() => {{ const a = __app.game.animals.list[{idx}], p = __app.player; p.pos.y += 14;
                  a.wait = 0; a.tgt = new __app.THREE.Vector3(a.pos.x + Math.sin(a.yaw) * 5, 0, a.pos.z + Math.cos(a.yaw) * 5); a.roam = 0; }})()""")
                sim_wait(s, 0.7)
                amps = []
                for k in range(4):
                    s.ev("__game.freeze(true)")
                    amps.append(s.ev(f"(() => {{ const a = __app.game.animals.list[{idx}]; return a.kind === 'hase' ? a.hop : a.walkAmp * Math.sin(a.walkPh); }})()"))
                    cam_shot(s, idx, f'{tag}_{wid}_{kind}_gang{k}', side=1.57, dist=3.0, h=0.6, look=0.4)
                    s.ev("__game.freeze(false)"); sim_wait(s, 0.13)
                res['walk'][f'{wid}_{kind}'] = {'samples': [round(x, 2) for x in amps], 'amp': round(s.ev(f"__app.game.animals.list[{idx}].walkAmp"), 2)}
                # Blinzeln über 6 s zählen
                s.ev(f"""(() => {{ window.__bl = 0; const a = __app.game.animals.list[{idx}]; a.blinkT = 0.5; let was = false;
                  (function f() {{ const on = a.blink > 0; if (on && !was) __bl++; was = on; if (window.__blOn !== false) requestAnimationFrame(f); }})(); }})()""")
                sim_wait(s, 6); s.ev("window.__blOn = false")
                res['blink'][f'{wid}_{kind}'] = s.ev("__bl"); s.ev("window.__blOn = true")
                # Freude: Herzchen + ^ ^
                s.ev(f"""(() => {{ const a = __app.game.animals.list[{idx}], p = __app.player; p.pos.y -= 14; __app.game.animals.cheer(a); }})()""")
                sim_wait(s, 0.35)
                s.ev("__game.freeze(true)")
                res['joy'][f'{wid}_{kind}'] = {'joy': round(s.ev(f"__app.game.animals.list[{idx}].joy"), 2), 'hearts': s.ev("(() => { const B = __app.bursts; let n = 0; for (let i = 0; i < B.n; i++) if (B.p[i * 4 + 3] === 3) n++; return n; })()")}
                cam_shot(s, idx, f'{tag}_{wid}_{kind}_freude', side=0.3, dist=3.2, h=1.1, look=0.8)
                s.ev("__game.freeze(false)")
        res.setdefault('info', {})[f'{tag}_{wid}'] = s.ev("__game.info()")
    res.setdefault('errors', []).extend(s.errors[:5])
    s.close()

with sync_playwright() as pw:
    run(PIXEL7, 'hoch')
    run(PIXEL7_LAND, 'quer')

if NEW:
    L = res['look']
    look_ok = all(abs(v['rest_err']) < 0.35 for k, v in L.items() if not v['sleepy'])
    walk_ok = all(max(abs(x) for x in v['samples']) > 0.1 for v in res['walk'].values())
    res['ok'] = look_ok and walk_ok and all(v >= 1 for v in res['blink'].values()) and all(v['joy'] > 0.8 and v['hearts'] > 0 for v in res['joy'].values()) and not res['errors']
json.dump(res, open(f'tests/out/v24_tiere_{TAG}.json', 'w'), indent=1)
print(json.dumps({k: res[k] for k in res if k not in ('shots', 'info')}, indent=1))
print('ok', res.get('ok'))
