# Performance: renderer.info (Draw-Calls/Dreiecke) je Welt & Stufe; FPS mit/ohne Effekt-Spam (A/B/A/B)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
res = {'info': {}, 'spam': {}}
def fps_window(s, sec=4.0):
    f0 = s.ev("__app.frames"); t0 = time.time(); time.sleep(sec); return (s.ev("__app.frames") - f0) / (time.time() - t0)
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'P'); s.tap('[data-a=create]')
    s.wait_audio()
    for q in [0, 1, 2]:
        s.ev(f"__game.setQuality({q})")
        for lid in ['1-1', '2-1', '3-1', '4-1', '5-1']:
            s.ev(f"__game.start('{lid}', 'mittel')"); time.sleep(1.2)
            info = json.loads(s.ev("JSON.stringify(__game.info())"))
            res['info'][f'q{q}_{lid}'] = info
            print(f'q{q}', lid, info, flush=True)
    # Effekt-Spam-Vergleich (Stufe Niedrig, damit CPU-Anteile sichtbar werden)
    s.ev("__game.setQuality(0)"); s.ev("__game.start('1-1', 'mittel')"); time.sleep(2)
    s.ev("""window.__spam = false; setInterval(() => { if (!window.__spam) return; const a = __app.audio; const p = Math.random() * 2 - 1;
      a.collect(1 + (Math.random() * 10 | 0), p, ['ring', 'visit', 'land', 'x'][Math.random() * 4 | 0]); a.sfx(['boing', 'loop', 'roll', 'splash', 'tap'][Math.random() * 5 | 0], p); }, 50);""")
    A, B = [], []
    for i in range(3):
        s.ev("window.__spam = false"); A.append(fps_window(s))
        s.ev("window.__spam = true"); B.append(fps_window(s))
    s.ev("window.__spam = false")
    a, b = sum(A) / len(A), sum(B) / len(B)
    res['spam'] = {'fps_ohne': round(a, 2), 'fps_mit': round(b, 2), 'diff_pct': round((a - b) / a * 100, 1), 'A': A, 'B': B, 'audio_stats': s.ev("__app.audio.stats"), 'voices_now': s.ev("__app.audio.voices.length")}
    print(json.dumps(res['spam']))
    res['errors'] = s.errors
    json.dump(res, open('tests/out/perf_report.json', 'w'), indent=1)
    s.close()
