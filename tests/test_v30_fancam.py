# v3.0 Fan-Cam-Clip der Sieger-Flugshow: echter Levelsieg mit ?finale=flugshow →
#   Clip läuft (8–12 s), Schnitte liegen auf dem Beat (Abweichung < 1 Bild, gemessen an der Clip-Uhr und an der Audio-Uhr),
#   Speed-Ramps (Zeitlupe < 0,35, „zack“ > 1,5), Figurnamen, höchstens 3 Blitze, Ergebnis danach mit „Clip nochmal“,
#   Überspringen per Tipp, „Blitze reduzieren“, ?edit=0 = bisherige Sieger-Kamera, Querformat, keine JS-Fehler.
# Bildfolgen (Hoch/Quer) → tests/shots/v30/clip_*.png + Collagen (Vision-Check).
import time, json, sys, os
# Takt-/Beat-Messung braucht volle Bildrate: Browser per `open` (macOS-Queue drosselt Kindprozesse auf ~8–15 Bilder/s)
if sys.platform == 'darwin': os.environ.setdefault('BROWSER', 'open')
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/v30'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
res = {}
FRAME = 1 / 60

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def setup(s, q='&finale=flugshow'):
    s.open('?nosw' + q); s.tap('#title'); s.pg.fill('input.name', 'Sternchen'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
    s.ev("__app.album = () => {}")

def win(s):
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    s.ev("__app.player.pos.y += 3")
    for i in range(20):
        if s.ev("__app.game.tasks[0].max - __app.game.tasks[0].cur") <= 1: break
        s.ev("__game.step()"); sim_wait(s, 0.05)
    s.ev("""(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken), p = __app.player;
      const yaw = p.yaw; p.pos.set(it.pos.x - Math.sin(yaw) * 9, it.pos.y, it.pos.z - Math.cos(yaw) * 9); p.pitch = 0; })()""")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    t1 = time.time()
    while s.ev("__app.game.state") != 'won' and time.time() - t1 < 20: time.sleep(0.02)

# Clip messen (ohne Einfrieren – die Uhr hängt an der Audio-Uhr); optional Bilder ohne Anhalten
def measure(s, shots=None, n=0):
    rec = []; k = 0; t1 = time.time()
    while time.time() - t1 < 40:
        st = s.ev("""(() => { const f = __game.fancam(), S = __app.player.stunt; return { on: f.on, t: f.t, ts: __app.timeScale, p: S ? S.p : -1,
          shot: f.shot, ph: f.ramp.ph, flash: f.flashK, rgb: f.rgbK, name: document.querySelector('#fancam .fcName b') ? document.querySelector('#fancam .fcName b').textContent : '' }; })()""")
        rec.append(st)
        if not st['on'] and len(rec) > 3: break
        if shots and k < n and st['t'] >= 0.35 + k * 10.3 / (n - 1):
            s.pg.screenshot(path=f'{OUT}/{shots}_{k}.png'); k += 1
        time.sleep(0.03)
    return rec

def grid(name, n, cols=4):
    from PIL import Image
    ims = [Image.open(f'{OUT}/{name}_{k}.png') for k in range(n) if os.path.exists(f'{OUT}/{name}_{k}.png')]
    if not ims: return
    w, h = ims[0].size; sc = 0.5 if h > w else 0.42
    W, Hh = int(w * sc), int(h * sc); rows = (len(ims) + cols - 1) // cols
    out = Image.new('RGB', (W * cols, Hh * rows), (15, 15, 15))
    for i, im in enumerate(ims): out.paste(im.resize((W, Hh)), ((i % cols) * W, (i // cols) * Hh))
    out.save(f'{OUT}/{name}_grid.jpg', quality=84)

def analyse(s, rec, tag):
    f = s.ev("""(() => { const f = __game.fancam(); return { cuts: f.cuts, log: f.log, a0: f.a0, done: f.done, skipped: !!f.skipped, flashes: f.flashes }; })()""")
    cuts = [c for c in f['cuts'] if c['beat'] > 0]
    dev_t = max([abs(c['t'] - c['beat']) for c in cuts] or [9])
    dev_a = max([abs(c['ta'] - c['beat']) for c in cuts if c['ta'] is not None] or [None]) if any(c['ta'] is not None for c in cuts) else None
    names = sorted(set(r['name'] for r in rec if r['name']))
    clip_len = max([r['t'] for r in rec] or [0])
    r = {'cuts': len(cuts), 'dev_t_ms': round(dev_t * 1000, 2), 'dev_audio_ms': round(dev_a * 1000, 2) if dev_a is not None else None,
         'whips': sum(1 for c in cuts if c['whip']), 'shots': sorted(set(c['shot'] for c in cuts)), 'clip_s': round(clip_len, 2),
         'ts_min': round(min(r['ts'] for r in rec), 2), 'ts_max': round(max(r['ts'] for r in rec), 2), 'names': names,
         'flashes': f['flashes'], 'flash_max': round(max(r['flash'] for r in rec), 2), 'rgb_max': round(max(r['rgb'] for r in rec), 2),
         'syncs': sum(1 for l in f['log'] if l['k'] == 'sync'), 'done': f['done'], 'skipped': f['skipped'], 'audio': s.ev("__app.audio.state")}
    print(tag, json.dumps(r), flush=True)
    return r

def wait_result(s, t=30):
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < t: time.sleep(0.1)
    return s.ev("__app.ui.current") == 'result'

with sync_playwright() as pw:
    # --- 1) Hochformat: echter Sieg → Clip (Messlauf, Bilder ohne Anhalten)
    s = Session(pw, dpr=1)
    setup(s)
    win(s)
    res['started'] = s.ev("!!(__app.game.finale && __app.game.finale.edit && __game.fancam().on)")
    res['finale_id'] = s.ev("__app.game.finale && __app.game.finale.id")
    rec = measure(s)  # Messlauf ohne Bildaufnahmen (Aufnahmen halten die Seite kurz an → Audio-Uhr läuft davon)
    res['hoch'] = analyse(s, rec, 'hoch')
    res['hoch']['result'] = wait_result(s)
    res['hoch']['clip_btn'] = s.ev("!!document.querySelector('[data-a=clip]')")
    res['hoch']['end_rot'] = s.ev("(() => { const c = __app.player.critter.tilt.rotation; return Math.max(Math.abs(c.x), Math.abs(c.y), Math.abs(c.z)); })()")
    res['hoch']['timescale_after'] = s.ev("__app.timeScale")
    res['hoch']['hud_back'] = s.ev("!document.body.classList.contains('clip')")
    # --- 1b) „Clip nochmal“ mit Bildfolge (Collage für den Vision-Check)
    s.tap('[data-a=clip]'); time.sleep(0.2)
    rec = measure(s, 'clip_hoch', 8)
    res['hoch_bilder'] = analyse(s, rec, 'hoch_bilder')
    res['hoch_bilder']['result'] = wait_result(s)
    grid('clip_hoch', 8)
    # --- 2) „Clip nochmal“ + Überspringen per Tipp
    s.tap('[data-a=clip]')
    time.sleep(0.2)
    res['replay_on'] = s.ev("__game.fancam().on")
    sim_wait(s, 1.6)
    box = s.pg.locator('#fancam').bounding_box()
    s.pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    time.sleep(0.3)
    res['skip'] = {'off': not s.ev("__game.fancam().on"), 'skipped': s.ev("!!__game.fancam().skipped"), 'result': wait_result(s, 10),
                   'ts': s.ev("__app.timeScale"), 'stunt_gone': s.ev("!__app.player.stunt")}
    # --- 3) Blitze reduzieren (Einstellung) + Bildfolge mit Anhalten (Uhr ohne Audio-Bindung)
    s.ev("__app.setSetting('blitze', 'wenig')")
    s.tap('[data-a=clip]'); time.sleep(0.2)
    rec = measure(s)
    res['blitze_wenig'] = analyse(s, rec, 'blitze_wenig')
    res['blitze_wenig']['result'] = wait_result(s)
    s.ev("__app.setSetting('blitze', 'normal')")
    res['errors'] = list(s.errors[:5])
    s.close()
    # --- 4) Querformat
    s = Session(pw, device=PIXEL7_LAND, dpr=1)
    setup(s)
    win(s)
    rec = measure(s, 'clip_quer', 8)
    res['quer'] = analyse(s, rec, 'quer')
    res['quer']['result'] = wait_result(s)
    grid('clip_quer', 8)
    res['errors'] += s.errors[:5]
    s.close()
    # --- 5) ?edit=0: bisherige Sieger-Kamera (kein Clip), Flugshow läuft trotzdem
    s = Session(pw, dpr=1)
    setup(s, '&finale=flugshow&edit=0')
    win(s)
    res['edit0'] = {'finale': s.ev("__app.game.finale && __app.game.finale.id"), 'clip': s.ev("__game.fancam().on"),
                    'edit': s.ev("!!(__app.game.finale && __app.game.finale.edit)")}
    res['edit0']['result'] = wait_result(s)
    res['edit0']['clip_btn'] = s.ev("!!document.querySelector('[data-a=clip]')")
    res['errors'] += s.errors[:5]
    s.close()

H, Q, B = res['hoch'], res['quer'], res['blitze_wenig']
# timing=False: Läufe mit Bildaufnahmen (jede Aufnahme hält die Seite an → Takt-Messung dort nicht aussagekräftig)
def clip_ok(r, timing=True):
    return (r['cuts'] >= 8 and (not timing or (r['dev_t_ms'] < FRAME * 1000 and (r['dev_audio_ms'] is None or r['dev_audio_ms'] < FRAME * 1000)))
            and 8 <= r['clip_s'] <= 12.5 and r['ts_min'] < 0.35 and r['ts_max'] > 1.5 and len(r['names']) >= 3 and r['flashes'] <= 3
            and len(r['shots']) >= 4 and r['whips'] >= 1 and r['done'] and not r['skipped'])
res['ok'] = (res['started'] and res['finale_id'] == 'flugshow' and clip_ok(H) and H['result'] and H['clip_btn'] and H['end_rot'] < 0.02
             and H['timescale_after'] == 1 and H['hud_back'] and res['replay_on']
             and res['skip']['off'] and res['skip']['skipped'] and res['skip']['result'] and res['skip']['ts'] == 1
             and clip_ok(B) and B['flash_max'] <= 0.2 and B['rgb_max'] == 0 and clip_ok(Q, False) and Q['result']
             and clip_ok(res['hoch_bilder'], False) and res['hoch_bilder']['result']
             and res['edit0']['finale'] == 'flugshow' and not res['edit0']['clip'] and not res['edit0']['edit'] and res['edit0']['result']
             and not res['edit0']['clip_btn'] and not res['errors'])
json.dump(res, open('tests/out/v30_fancam.json', 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ('hoch', 'quer', 'blitze_wenig', 'hoch_bilder')}, indent=1))
print('ok', res['ok'])
