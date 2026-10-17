# v3.1 Flatter-Stoß im Browser: echte Zeiger-Ereignisse auf der Tipp-Ebene (Tipp-Modus und Joystick) und Tastatur.
#   kurzer Tipp ▲ → Stoß, Halten ≥ 0,2 s → nie ein Stoß (Messgröße 4), Schieben → kein Stoß, ?flatter=0 → nie.
import time, json, sys
sys.path.insert(0, 'tests')
from util import *

PTR = """(async ([typ, x, y, ms, dy, id]) => {
  const L = document.getElementById('touch'), X = innerWidth * x, Y = innerHeight * y;
  const ev = (t, yy, tgt) => tgt.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: X, clientY: yy, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
  ev('pointerdown', Y, L);
  if (dy) { await new Promise(r => setTimeout(r, ms / 2)); ev('pointermove', Y + dy, window); await new Promise(r => setTimeout(r, ms / 2)); }
  else await new Promise(r => setTimeout(r, ms));
  ev('pointerup', Y + dy, window);
  await new Promise(r => setTimeout(r, 120));
  return __app.player.flat.stoesse;
})"""

def lauf(s, query, steuer='zones'):
    s.open('?nosw' + query)
    s.tap('#title'); s.pg.fill('input.name', 'Flattern'); s.tap('[data-a=create]')
    s.ev(f"(() => {{ const st = __app.progress.settings; st.control = '{steuer}'; __app.applySettings(); }})()")
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(1.5)
    s.ev("__app.player.pos.y += 4")
    res = {}
    n0 = s.ev("__app.player.flat.stoesse")
    if steuer == 'zones':
        res['tipp'] = s.ev(PTR, ['t', 0.5, 0.25, 60, 0, 11]) - n0; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['halten300'] = s.ev(PTR, ['t', 0.5, 0.25, 300, 0, 12]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['halten210'] = s.ev(PTR, ['t', 0.5, 0.25, 230, 0, 13]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['schieben'] = s.ev(PTR, ['t', 0.5, 0.6, 120, -60, 14]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['unten'] = s.ev(PTR, ['t', 0.5, 0.7, 60, 0, 15]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['seite'] = s.ev(PTR, ['t', 0.1, 0.5, 60, 0, 16]) - n; time.sleep(0.4)
        # drei Tipps im Takt (0,3 s)
        n = s.ev("__app.player.flat.stoesse")
        for k in range(3): s.ev(PTR, ['t', 0.5, 0.25, 50, 0, 20 + k]); time.sleep(0.13)
        res['drei'] = s.ev("__app.player.flat.stoesse") - n
        # echter Touch-Tipp über Playwright
        s.pg.wait_for_function("__app.game.time - __app.player.flat.last > 0.4", timeout=10000)
        n = s.ev("__app.player.flat.stoesse")
        s.pg.touchscreen.tap(206, 230); time.sleep(0.3)
        res['touch'] = s.ev("__app.player.flat.stoesse") - n
        # Tastatur: kurz ↑ = Stoß, lang ↑ = keiner
        s.pg.wait_for_function("__app.game.time - __app.player.flat.last > 0.4", timeout=10000)  # Mindestabstand in Spielzeit
        n = s.ev("__app.player.flat.stoesse")
        s.pg.keyboard.down('ArrowUp'); time.sleep(0.06); s.pg.keyboard.up('ArrowUp'); time.sleep(0.2)
        res['taste'] = s.ev("__app.player.flat.stoesse") - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); s.pg.keyboard.down('ArrowUp'); time.sleep(0.5); s.pg.keyboard.up('ArrowUp'); time.sleep(0.2)
        res['taste_lang'] = s.ev("__app.player.flat.stoesse") - n
    else:
        res['schnipp'] = s.ev(PTR, ['t', 0.25, 0.7, 80, -40, 31]) - n0; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['stick_halten'] = s.ev(PTR, ['t', 0.25, 0.7, 400, -40, 32]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['rechts_tipp'] = s.ev(PTR, ['t', 0.8, 0.5, 60, 0, 33]) - n; time.sleep(0.4)
        n = s.ev("__app.player.flat.stoesse"); res['rechts_halten'] = s.ev(PTR, ['t', 0.8, 0.5, 300, 0, 34]) - n
    res['errors'] = s.errors[:5]
    return res

ok = True
with sync_playwright() as pw:
    for q, steuer, soll in [('', 'zones', dict(tipp=1, halten300=0, halten210=0, schieben=0, unten=0, seite=0, drei=3, touch=1, taste=1, taste_lang=0)),
                            ('', 'stick', dict(schnipp=1, stick_halten=0, rechts_tipp=1, rechts_halten=0)),
                            ('&flatter=0', 'zones', dict(tipp=0, halten300=0, drei=0, touch=0, taste=0))]:
        s = Session(pw, dpr=1)
        r = lauf(s, q, steuer); s.close()
        bad = {k: (r.get(k), v) for k, v in soll.items() if r.get(k) != v}
        print(q or 'Standard', steuer, json.dumps(r, ensure_ascii=False), 'OK' if not bad and not r['errors'] else f'FEHLER {bad}')
        ok = ok and not bad and not r['errors']
print('FLATTER OK' if ok else 'FLATTER FEHLER')
sys.exit(0 if ok else 1)
