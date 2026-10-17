# v3.1 Ausweich-Rolle im Browser: echte Zeiger-Ereignisse auf der Tipp-Ebene.
#   Doppeltipp links/rechts → Rolle (Mittel/Schwer), Leicht → keine; Messgröße 4: 60 s „Kind lenkt“ (Halten mit zufälligen
#   Längen und kurzen Pausen, auch schnelles Nachgreifen) → 0 Rollen; Wespe in der Rolle prallt ab (kein Schwindel, Kombo bleibt).
import time, json, sys, random
sys.path.insert(0, 'tests')
from util import *

DRUCK = """(async (folge) => {   // folge: [[seite 'L'|'R', dauer_ms, pause_ms], ...] – echte Wartezeiten
  const L = document.getElementById('touch'), id0 = 100 + Math.floor(Math.random() * 1e5);
  let id = id0;
  for (const [s, ms, pause] of folge) {
    const X = innerWidth * (s === 'L' ? 0.12 : 0.88), Y = innerHeight * 0.55, pid = id++;
    L.dispatchEvent(new PointerEvent('pointerdown', { pointerId: pid, clientX: X, clientY: Y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }));
    await new Promise(r => setTimeout(r, ms));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: pid, clientX: X, clientY: Y, bubbles: true, pointerType: 'touch' }));
    await new Promise(r => setTimeout(r, pause));
  }
  await new Promise(r => setTimeout(r, 150));
  return __app.game.rollen || 0;
})"""

def neu(pw, diff, q=''):
    s = Session(pw, dpr=1)
    s.open('?nosw' + q); s.tap('#title'); s.pg.fill('input.name', 'Rolle'); s.tap('[data-a=create]')
    s.ev(f"__game.start('1-1', '{diff}')"); time.sleep(1.5)
    s.ev("__app.player.pos.y += 4")
    return s

res = {}; ok = True
with sync_playwright() as pw:
    s = neu(pw, 'mittel')
    res['doppel_L'] = s.ev(DRUCK, [['L', 60, 120], ['L', 300, 1300]])
    res['versatz_ok'] = True
    res['doppel_R'] = s.ev(DRUCK, [['R', 70, 100], ['R', 200, 1300]]) - res['doppel_L']
    n0 = s.ev("__app.game.rollen || 0")
    res['halten_dann_tipp'] = s.ev(DRUCK, [['L', 400, 150], ['L', 60, 1300]]) - n0       # erster Druck lang → keine Rolle
    n0 = s.ev("__app.game.rollen || 0")
    res['zu_langsam'] = s.ev(DRUCK, [['R', 60, 400], ['R', 60, 1300]]) - n0              # 0,46 s zwischen den Drücken
    n0 = s.ev("__app.game.rollen || 0")
    res['links_rechts'] = s.ev(DRUCK, [['L', 60, 80], ['R', 60, 1300]]) - n0             # verschiedene Seiten
    # Kind lenkt 60 s: Halten 0,25–1,5 s, Pausen 0,1–0,7 s, Seite zufällig, oft dieselbe Seite nachgegriffen
    random.seed(7); folge = []; t = 0
    while t < 60000:
        d = random.randint(250, 1500); p = random.randint(100, 700); folge.append([random.choice('LLR'), d, p]); t += d + p
    n0 = s.ev("__app.game.rollen || 0")
    s.pg.set_default_timeout(120000)
    res['kind_60s'] = s.ev(DRUCK, folge) - n0; res['kind_druecke'] = len(folge)
    # Wespe in der Rolle: Wespe direkt auf die Figur setzen
    res['wespe'] = s.ev("""(() => { const a = __app, g = a.game, pl = a.player, dt = 1 / 60; window.__freeze = 1;
      pl.pos.y = Math.max(pl.pos.y, 5); pl.rolleCd = 0; pl.landed = false; const ok = pl.rolle(1);
      g.combo = 3; g.lastHit = g.time; const w = g.wasps.list[0];
      for (let i = 0; i < 20 && w; i++) { w.cd = 0; w.c.copy(pl.pos); w.pos.copy(pl.pos); w.r = 0.01; a.t += dt; a.input.injected = { turn: 0, climb: 0 }; a.input.update(dt); g.update(dt, a.t, a.input); }
      const r = { rolle: ok, abgeprallt: g.abgeprallt || 0, dizzy: pl.dizzyT, combo: g.combo, wespen: g.wasps.list.length, ext: pl.ext.length() };
      // Gegenprobe ohne Rolle: Wespe schubst wie bisher
      pl.rolleS = null; if (w) { w.cd = 0; w.c.copy(pl.pos); w.pos.copy(pl.pos); a.t += dt; a.input.update(dt); g.update(dt, a.t, a.input); }
      r.ohne_dizzy = pl.dizzyT; window.__freeze = undefined; a.input.injected = null; return r; })()""")
    res['errors'] = s.errors[:3]; s.close()
    s = neu(pw, 'leicht')
    res['leicht'] = s.ev(DRUCK, [['L', 60, 120], ['L', 200, 1000]]); res['errors_l'] = s.errors[:3]; s.close()
    s = neu(pw, 'mittel', '&rolle=0')
    res['aus'] = s.ev(DRUCK, [['L', 60, 120], ['L', 200, 1000]]); res['errors_a'] = s.errors[:3]; s.close()
print(json.dumps(res, ensure_ascii=False))
chk = [('Doppeltipp links → Rolle', res['doppel_L'] == 1), ('Doppeltipp rechts → Rolle', res['doppel_R'] == 1),
       ('Halten, dann Tipp → keine', res['halten_dann_tipp'] == 0), ('zu langsam → keine', res['zu_langsam'] == 0),
       ('links+rechts → keine', res['links_rechts'] == 0), ('Kind lenkt 60 s → 0 Rollen', res['kind_60s'] == 0),
       ('Wespe prallt ab', res['wespe']['rolle'] and res['wespe']['abgeprallt'] >= 1 and res['wespe']['dizzy'] == 0 and res['wespe']['combo'] >= 3 and res['wespe']['ohne_dizzy'] > 0),
       ('Leicht → keine Rolle', res['leicht'] == 0), ('?rolle=0 → keine', res['aus'] == 0),
       ('keine Fehler', not res['errors'] and not res['errors_l'] and not res['errors_a'])]
for n, v in chk: print(('OK   ' if v else 'FEHL ') + n); ok = ok and v
json.dump(res, open('tests/out/v31_rolle.json', 'w'), indent=1, ensure_ascii=False)
print('ROLLE OK' if ok else 'ROLLE FEHLER')
sys.exit(0 if ok else 1)
