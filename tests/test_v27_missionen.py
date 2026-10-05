# v2.7 Mehr Missionen: 8 je Welt, Freischaltung (in der Welt der Reihe nach, nächste Welt nach 3 geschafften Missionen),
# Altprofil aus v2.6 (Fortschritt + Werkstatt-Bestandsschutz), ?weltfrei=N, „Weiter“-Ziel, „Neue Welt offen“,
# scrollbare Missionsliste mit ECHTEN Touch-Gesten (CDP Input.dispatchTouchEvent): senkrecht scrollt die Liste ohne
# Weltwechsel, waagrecht wechselt die Welt – hoch 412×915 und quer 915×412. Kunststück-Missionen (🎪 zählt nur dort),
# neue Rivalen. Bilder: tests/shots/v27/*.jpg   Ergebnis: tests/out/v27_missionen.json
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
from test_ui import CHECK
from PIL import Image
OUT = 'tests/shots/v27'
# iPhone 13/14 (390×844, wie im Brief „iPhone-Viewport“): weniger Höhe → Liste scrollt deutlich
IPHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True,
              user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
res = {}; fails = []
def ok(c, msg):
    print(('  ok   ' if c else '  FEHLER ') + msg, flush=True)
    if not c: fails.append(msg)
    return c
def jpg(s, name):
    p = f'{OUT}/{name}.png'; s.pg.screenshot(path=p)
    Image.open(p).convert('RGB').save(p[:-4] + '.jpg', quality=86); os.remove(p)
def unlocked(s): return s.ev("__game.unlocked()")
def win(s, ids, diff='leicht', stars=1):
    s.ev(f"""{json.dumps(ids)}.forEach(id => {{ const L = __app.progress.cur.levels[id] || (__app.progress.cur.levels[id] = {{}}); L['{diff}'] = {{stars: {stars}, time: 50, combo: 3}}; }}); __app.progress.save()""")
def new_profile(s, name='Mia'):
    s.open(); s.tap('#title'); s.pg.fill('input.name', name); s.tap('[data-a=create]'); s.ev("__game.setQuality(0)")

# Profil, wie v2.6 es gespeichert hat: 1-1 … 2-1 geschafft, 30 Sterne (alte Schwellen: bis „Riese“ frei, neue nur bis Mini-Drache)
V26 = {"v": 2, "current": "p26", "settings": {"music": 0.7, "sfx": 0.9, "haptics": True, "control": "zones", "quality": "auto"},
       "profiles": [{"id": "p26", "name": "Lena", "color": "#ff7eb6", "created": 1759000000000, "diff": "leicht",
                     "look": {"char": "schmetterling", "per": {"schmetterling": {"a": 16743094, "b": 16757611, "c": 16765503, "hat": "kranz", "pattern": "verlauf"}}},
                     "levels": {"1-1": {"leicht": {"stars": 3, "time": 60, "combo": 5}, "mittel": {"stars": 3, "time": 60, "combo": 5}, "schwer": {"stars": 3, "time": 60, "combo": 5}},
                                "1-2": {"leicht": {"stars": 3, "time": 90, "combo": 5}, "mittel": {"stars": 3, "time": 90, "combo": 5}, "schwer": {"stars": 3, "time": 90, "combo": 5}},
                                "1-3": {"leicht": {"stars": 3, "time": 80, "combo": 5}, "mittel": {"stars": 3, "time": 80, "combo": 5}, "schwer": {"stars": 3, "time": 80, "combo": 5}},
                                "2-1": {"leicht": {"stars": 3, "time": 85, "combo": 5}}},
                     "stats": {"collected": 40}, "album": {}, "badges": {"erstflug": 1759000000000, "welt1": 1759000000000}, "daily": {"done": {}},
                     "seen": {"tut1": 1}, "fun": {"hupe": False, "pupsTon": True}, "seenUnl": {"trail:blasen": 1}, "lv": 22}]}

# --- Touch-Wischen per CDP (echte Touch-Ereignisse → Browser entscheidet selbst, welcher Bereich scrollt)
def swipe(s, x0, y0, x1, y1, steps=14, dt=0.016):
    cdp = s.cdp
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for i in range(1, steps + 1):
        k = i / steps
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * k, 'y': y0 + (y1 - y0) * k}]})
        time.sleep(dt)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    time.sleep(0.9)  # Ausrollen + Einrasten
SCROLL = """(() => { const ws = document.querySelector('.worlds'), lv = document.querySelectorAll('.wcard .lv')[0];
  const cards = [...ws.children], mid = ws.scrollLeft + ws.clientWidth / 2;
  const cur = cards.reduce((b, c, i) => Math.abs(c.offsetLeft + c.clientWidth / 2 - mid) < Math.abs(cards[b].offsetLeft + cards[b].clientWidth / 2 - mid) ? i : b, 0);
  return { left: ws.scrollLeft, top: lv.scrollTop, maxTop: lv.scrollHeight - lv.clientHeight, card: cur }; })()"""
# Layout-Prüfung der Karte: Kopfleiste/Stufenwahl frei, Knöpfe ≥ 48 px, Sterne lesbar, Liste innerhalb der Karte
LAYOUT = """(() => { const bad = [], r = (q) => document.querySelector(q).getBoundingClientRect();
  const top = r('.maptop'), seg = r('.maptop .seg'), bar = r('.mapbar'), card = document.querySelectorAll('.wcard')[0].getBoundingClientRect();
  if (card.top < Math.max(top.bottom, seg.bottom) - 1) bad.push('karte-unter-kopfleiste:' + Math.round(card.top) + '<' + Math.round(seg.bottom));
  if (card.bottom > bar.top + 1) bad.push('karte-ueber-mapbar:' + Math.round(card.bottom) + '>' + Math.round(bar.top));
  const lv = document.querySelectorAll('.wcard .lv')[0], lr = lv.getBoundingClientRect();
  if (lr.bottom > card.bottom + 1 || lr.top < card.top - 1) bad.push('liste-raus');
  lv.querySelectorAll('.lvbtn').forEach(b => { const q = b.getBoundingClientRect(); if (q.height < 47.5) bad.push('knopf-klein:' + b.dataset.v + ':' + Math.round(q.height)); });
  const st = parseFloat(getComputedStyle(lv.querySelector('.stars')).fontSize); if (st < 14) bad.push('sterne-klein:' + st);
  const vis = [...lv.querySelectorAll('.lvbtn')].filter(b => { const q = b.getBoundingClientRect(); return q.top >= lr.top - 1 && q.bottom <= lr.bottom + 1; }).length;
  return { bad, visible: vis, listH: Math.round(lr.height), cardH: Math.round(card.height), more: lv.parentElement.classList.contains('more-dn') }; })()"""

with sync_playwright() as pw:
    # ================================================================ 1) Regel: frisch, nach 2, nach 3 Missionen
    print('1) Freischalt-Regel (frisches Profil)')
    s = Session(pw, dpr=1); new_profile(s)
    lv = s.ev("__game.levels()")
    ok(len(lv) == 40 and lv[:3] == ['1-1', '1-2', '1-3'] and all(f'{w}-{i}' in lv for w in range(1, 6) for i in range(1, 9)), f'40 Missionen, IDs 1-1 … 5-8 ({len(lv)})')
    u0 = unlocked(s); ok(u0 == ['1-1'], f'frisch: nur 1-1 offen ({u0})')
    win(s, ['1-1', '1-2']); u2 = unlocked(s)
    ok(u2 == ['1-1', '1-2', '1-3'], f'nach 2 Missionen: 1-1 … 1-3, Welt 2 zu ({u2})')
    s.ev("__game.show('map')"); time.sleep(0.6)
    t2 = s.ev("document.querySelectorAll('.wcard')[1].querySelector('.wlock').innerText.replace(/\\s+/g, ' ')")
    ok('Schaffe 3 Missionen' in t2 and 'Frühlingswiese' in t2 and '2 / 3' in t2, f'Sperr-Hinweis Welt 2: „{t2}“')
    s.ev("document.querySelector('.worlds').scrollLeft = document.querySelectorAll('.wcard')[1].offsetLeft - 40"); time.sleep(0.7)
    jpg(s, 'karte_sperre_hoch')
    s.tap('.wcard >> nth=1'); time.sleep(0.2)
    toast = s.ev("(document.querySelector('.mtoast') || {}).textContent || ''")
    ok('Schaffe noch 1 Mission in' in toast, f'Tipp auf gesperrte Welt → Toast „{toast}“')
    win(s, ['1-3']); u3 = unlocked(s)
    ok(u3 == ['1-1', '1-2', '1-3', '1-4', '2-1'], f'nach 3 Missionen: 1-4 UND 2-1 offen ({u3})')
    s.ev("__game.show('map')"); time.sleep(0.5)
    ok(s.ev("!document.querySelectorAll('.wcard')[1].querySelector('.wlock') && !!document.querySelectorAll('.wcard')[2].querySelector('.wlock')"), 'Karte: Welt 2 offen, Welt 3 gesperrt')
    t3 = s.ev("document.querySelectorAll('.wcard')[2].querySelector('.wlock').innerText.replace(/\\s+/g, ' ')")
    ok('Sonnenblumenfeld' in t3 and '0 / 3' in t3, f'Welt 3 verlangt 3 Missionen im Sonnenblumenfeld: „{t3}“')
    # gesperrte Mission in offener Welt → „Schaffe zuerst Mission 4!“
    s.ev("document.querySelectorAll('.wcard .lv')[0].scrollTop = 999"); time.sleep(0.3)
    s.tap('[data-a=level][data-v="1-5"]'); time.sleep(0.2)
    toast = s.ev("(document.querySelector('.mtoast') || {}).textContent || ''")
    ok('Schaffe zuerst Mission 4' in toast, f'gesperrte Mission 1-5 → „{toast}“')
    jpg(s, 'karte_mission_gesperrt_hoch')
    # Stufe egal: Mittel-Stern zählt für die Freischaltung
    s.ev("__app.progress.cur.levels = {}; __app.progress.save()"); win(s, ['1-1', '1-2', '1-3'], 'mittel')
    ok('2-1' in unlocked(s), 'Sterne auf Mittel zählen genauso')
    # nicht der Reihe nach (z. B. Fortschritt per Hand): 3 beliebige Missionen reichen
    s.ev("__app.progress.cur.levels = {}; __app.progress.save()"); win(s, ['1-1', '1-4', '1-7'])
    ok('2-1' in unlocked(s) and s.ev("__app.progress.worldCount('wiese')") == 3, '3 beliebige geschaffte Missionen öffnen Welt 2')
    # „Weiter“-Ziele
    s.ev("__app.progress.cur.levels = {}; __app.progress.save()")
    win(s, [f'1-{i}' for i in range(1, 9)] + ['2-1', '2-2', '2-3'] + [f'5-{i}' for i in range(1, 9)])
    nx = s.ev("({a: __app.progress.nextMission('1-3'), b: __app.progress.nextMission('1-8'), c: __app.progress.nextMission('2-3'), d: __app.progress.nextMission('5-8'), e: __app.progress.nextMission('3-8')})")
    ok(nx == {'a': '1-4', 'b': '2-1', 'c': '2-4', 'd': None, 'e': None}, f'Weiter: 1-3→1-4, 1-8→2-1, 2-3→2-4, 5-8→keins, 3-8 (Welt 4 zu)→keins ({nx})')
    res['regel'] = {'frisch': u0, 'nach2': u2, 'nach3': u3, 'weiter': nx}
    # Kunststück-Mission: 🎪 zählt nur dort
    s.ev("__game.start('1-4', 'leicht')"); time.sleep(0.4)
    s.ev("__game.stunt(0)"); t0 = time.time()
    while s.ev("__app.game.tasks[0].cur") < 1 and time.time() - t0 < 8: time.sleep(0.1)
    c14 = s.ev("({cur: __app.game.tasks[0].cur, want: document.getElementById('bShow').classList.contains('want'), hud: document.getElementById('tasks').innerText})")
    ok(c14['cur'] == 1 and c14['want'] and '🎪1/3' in c14['hud'], f'1-4: ein 🎪-Kunststück zählt 1/3, Knopf leuchtet ({c14})')
    time.sleep(2.6); jpg(s, 'mission_1-4_kunststueck_hoch')
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.4)
    s.ev("__game.stunt(0)"); time.sleep(2.5)
    c11 = s.ev("({tasks: __app.game.tasks.map(t => t.cur), want: document.getElementById('bShow').classList.contains('want')})")
    ok(c11['tasks'] == [0] and not c11['want'], f'1-1: 🎪 bleibt purer Spaß, zählt nichts ({c11})')
    # neue Rivalen
    for lid, kind, name in [('1-8', 'hummel', 'Hugo Hummel'), ('4-8', 'schmetterling', 'Flora Falter'), ('5-7', 'mondfalter', 'Mona Mondfalter')]:
        s.ev(f"__app.quit(); __game.show('levelcard', {{id: '{lid}'}})"); time.sleep(0.3)
        txt = s.ev("document.querySelector('.tasklist').innerText")
        s.ev(f"__game.start('{lid}', 'mittel')"); time.sleep(0.4)
        k = s.ev("__app.game.race && __app.game.race.rival.kind")
        ok(k == kind and name in txt, f'{lid}: Rivale {k}, Karte „{txt}“')
    s.ev("__app.quit()")
    ok(s.errors == [], f'keine Fehler ({s.errors[:3]})')
    s.close()

    # ================================================================ 2) Altprofil aus v2.6
    print('2) Altprofil (v2.6-Stand: 1-1 … 2-1, 30 Sterne)')
    s = Session(pw, dpr=1)
    s.ctx.add_init_script("if (!localStorage.getItem('schmetterlingswiese.v2')) localStorage.setItem('schmetterlingswiese.v2', " + json.dumps(json.dumps(V26)) + ")")
    s.open()
    u = unlocked(s)
    ok(u == ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2'], f'Altprofil: 1-4 neu offen, Welt 2 offen bis 2-2, 3-1 zu ({u})')
    a = s.ev("""(() => { const P = __app.progress, p = P.cur; return { stars: P.stars(), lv: p.lv, levels: Object.keys(p.levels).length, badges: Object.keys(p.badges),
      keep: Object.keys(p.keepUnl).sort(), melone: P.isUnlocked('skin', 'melone'), pizza: P.isUnlocked('hat', 'pizza'), xl: P.isUnlocked('size', 'xl'), xs: P.isUnlocked('size', 'xs'),
      drache: P.isUnlocked('char', 'drache'), glitzer: P.isUnlocked('trail', 'glitzer'), umhang: P.isUnlocked('extra', 'umhang') }; })()""")
    ok(a['stars'] == 30 and a['lv'] == 27 and a['levels'] == 4 and set(a['badges']) == {'erstflug', 'welt1'}, f"Sterne/Level/Abzeichen erhalten, lv 27 ({a['stars']}, {a['badges']})")
    ok(a['melone'] and a['pizza'] and a['xl'] and a['xs'] and a['drache'], 'Bestandsschutz: Melone (alt 23), Pizza (26), Riese/Winzling (29) bleiben frei, obwohl neu 36/43/50')
    ok(not a['glitzer'] and not a['umhang'], 'nicht Freigeschaltetes bleibt zu (Glitzer alt 32, Umhang alt 36)')
    s.ev("__app.progress.save()"); s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    b = s.ev("({keep: Object.keys(__app.progress.cur.keepUnl).sort(), lv: __app.progress.cur.lv, melone: __app.progress.isUnlocked('skin', 'melone')})")
    ok(b['keep'] == a['keep'] and b['lv'] == 27 and b['melone'], f"nach Neuladen gleich ({len(b['keep'])} geschützt: {b['keep']})")
    # nächster Sieg: Melone (neu 36) darf nicht als „neu freigeschaltet“ wiederkommen
    r1 = s.ev("__app.progress.record('2-2', 'leicht', {stars: 3, time: 50, maxCombo: 3}, false)")
    r2 = s.ev("__app.progress.record('2-2', 'mittel', {stars: 3, time: 50, maxCombo: 3}, false)")
    ok([x['id'] for x in r1['unlocks'] + r2['unlocks']] == [] and r2['after'] == 36, f"30→36 Sterne: Melone wird nicht nochmal „freigeschaltet“ ({r1['unlocks']}, {r2['unlocks']})")
    ok(s.errors == [], f'keine Fehler ({s.errors[:3]})')
    res['altprofil'] = {'unlocked': u, **a}
    s.close()

    # ================================================================ 3) ?weltfrei=N (A/B)
    print('3) ?weltfrei=1 und ?weltfrei=8')
    for n, want in [(1, ['1-1', '1-2', '2-1']), (8, ['1-1', '1-2', '1-3', '1-4'])]:
        s = Session(pw, dpr=1); s.open(f'?nosw&weltfrei={n}'); s.tap('#title'); s.pg.fill('input.name', 'AB'); s.tap('[data-a=create]')
        win(s, ['1-1'] if n == 1 else ['1-1', '1-2', '1-3'])
        u = unlocked(s)
        s.ev("__game.show('map')"); time.sleep(0.4)
        lt = s.ev("(document.querySelectorAll('.wcard')[1].querySelector('.wlock') || {innerText: ''}).innerText.replace(/\\s+/g, ' ')")
        ok(u == want and (n == 1 or 'Schaffe 8 Missionen' in lt), f'weltfrei={n}: {u} · „{lt}“')
        res[f'weltfrei{n}'] = u
        s.close()

    # ================================================================ 4) Weiter + „Neue Welt offen“ im echten Ablauf
    print('4) Sieg in 1-3 (3. Mission): Weiter → 1-4, Knopf „Neue Welt offen“ → 2-1')
    for dev, tag in [(PIXEL7, 'hoch'), (PIXEL7_LAND, 'quer')]:
        s = Session(pw, device=dev, dpr=1); new_profile(s)
        win(s, ['1-1', '1-2'], stars=3)
        s.ev("__game.start('1-3', 'leicht')")
        for i in range(40):
            if s.ev("__app.game.state") == 'won': break
            s.ev("__game.step()"); time.sleep(0.05)
        t0 = time.time()
        while s.ev("__app.ui.current") != 'result' and time.time() - t0 < 30: time.sleep(0.2)
        time.sleep(2.6)
        r = s.ev("({nw: __app.lastResult.newWorld, btn: !!document.querySelector('[data-a=nextw][data-v=\"2-1\"]'), next: !!document.querySelector('[data-a=next]'), surprise: !!document.querySelector('[data-a=surprise]')})")
        ok(r['nw'] == 'sonne' and r['btn'] and (r['next'] or r['surprise']), f'{tag}: Ergebnis zeigt „Neue Welt offen: Sonnenblumenfeld“ ({r})')
        ok(s.ev(CHECK) == [], f'{tag}: Ergebnis Touch-Ziele/Ränder ok ({s.ev(CHECK)})')
        jpg(s, f'ergebnis_neue_welt_{tag}')
        if r['surprise']:
            s.tap('[data-a=surprise]'); time.sleep(1.5)
            while s.ev("__app.ui.current") == 'unlock': s.tap('[data-a=unlskip]'); time.sleep(0.5)
        else: s.tap('[data-a=next]'); time.sleep(0.6)
        ok(s.ev("__app.ui.current") == 'levelcard' and s.ev("__app.ui.data.id") == '1-4', f"{tag}: Weiter → Missionskarte 1-4 ({s.ev('__app.ui.current')} {s.ev('__app.ui.data && __app.ui.data.id')})")
        # zweiter Sieg (1-4): keine neue Welt mehr, Weiter → 1-5
        s.ev("__game.start('1-3', 'leicht')")
        for i in range(40):
            if s.ev("__app.game.state") == 'won': break
            s.ev("__game.step()"); time.sleep(0.05)
        t0 = time.time()
        while s.ev("__app.ui.current") != 'result' and time.time() - t0 < 30: time.sleep(0.2)
        time.sleep(1.5)
        ok(s.ev("__app.lastResult.newWorld") is None and not s.ev("!!document.querySelector('[data-a=nextw]')"), f'{tag}: nochmal 1-3 → kein „Neue Welt“-Knopf')
        s.tap('[data-a=map]'); time.sleep(0.5)
        ok(s.errors == [], f'{tag}: keine Fehler ({s.errors[:3]})')
        s.close()

    # ================================================================ 5) Liste: Layout, Startposition, Touch-Gesten
    for dev, tag in [(PIXEL7, 'hoch'), (IPHONE, 'iphone'), (PIXEL7_LAND, 'quer')]:
        print(f'5) Missionsliste {tag}')
        s = Session(pw, device=dev, dpr=1); new_profile(s)
        s.cdp = s.ctx.new_cdp_session(s.pg)
        win(s, [f'1-{i}' for i in range(1, 7)], stars=3)  # 1-1 … 1-6 mit 3 Sternen → Ziel: 1-7
        s.ev("__game.show('map')"); time.sleep(0.8)
        L = s.ev(LAYOUT)
        ok(L['bad'] == [] and s.ev(CHECK) == [], f"{tag}: Layout ok, Knöpfe ≥ 48 px, Sterne lesbar ({L['bad']}, {s.ev(CHECK)})")
        ok(3 <= L['visible'] < 8 and (tag == 'hoch' or L['visible'] <= 6), f"{tag}: Liste scrollbar ({L['visible']} von 8 ganz sichtbar, Liste {L['listH']} px, Karte {L['cardH']} px)")
        tg = s.ev("""(() => { const lv = document.querySelectorAll('.wcard .lv')[0], b = lv.querySelector('[data-v="1-7"]').getBoundingClientRect(), r = lv.getBoundingClientRect();
          return { inView: b.top >= r.top - 1 && b.bottom <= r.bottom + 1, top: lv.scrollTop }; })()""")
        ok(tg['inView'] and tg['top'] > 0, f'{tag}: beim Öffnen zur ersten offenen Mission ohne 3 Sterne (1-7) gescrollt ({tg})')
        jpg(s, f'karte_{tag}_start')
        s.ev("document.querySelectorAll('.wcard .lv')[0].scrollTop = 0; document.querySelectorAll('.wcard .lv')[0].dispatchEvent(new Event('scroll'))"); time.sleep(0.3)
        jpg(s, f'karte_{tag}_oben')
        ok(s.ev("document.querySelectorAll('.wcard .lvwrap')[0].classList.contains('more-dn')"), f'{tag}: oben: ▼-Hinweis + Ausblendrand an')
        lr = s.ev("(() => { const r = document.querySelectorAll('.wcard .lv')[0].getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width}; })()")
        a0 = s.ev(SCROLL)
        # senkrecht nach oben wischen → Liste scrollt nach unten, Welt bleibt
        swipe(s, lr['x'], lr['y'] + lr['h'] * 0.35, lr['x'] + 6, lr['y'] - lr['h'] * 0.35)
        a1 = s.ev(SCROLL)
        ok(a1['top'] >= min(a0['top'] + 40, a1['maxTop']) - 2 and a1['top'] > a0['top'] and a1['card'] == a0['card'] == 0 and abs(a1['left'] - a0['left']) < 2, f'{tag}: senkrecht wischen scrollt die Liste ({a0["top"]}→{a1["top"]} px), Welt bleibt 1 (scrollLeft {a0["left"]}→{a1["left"]})')
        jpg(s, f'karte_{tag}_gescrollt')
        # ganz runter: letzte Mission erreichbar, ▼ aus
        swipe(s, lr['x'], lr['y'] + lr['h'] * 0.35, lr['x'], lr['y'] - lr['h'] * 0.45); swipe(s, lr['x'], lr['y'] + lr['h'] * 0.35, lr['x'], lr['y'] - lr['h'] * 0.45)
        a2 = s.ev(SCROLL)
        end = s.ev("""(() => { const lv = document.querySelectorAll('.wcard .lv')[0], b = lv.querySelector('[data-v="1-8"]').getBoundingClientRect(), r = lv.getBoundingClientRect();
          return { last: b.bottom <= r.bottom + 1, more: lv.parentElement.classList.contains('more-dn'), up: lv.parentElement.classList.contains('more-up') }; })()""")
        ok(a2['top'] >= a2['maxTop'] - 2 and end['last'] and not end['more'] and end['up'] and a2['card'] == 0, f'{tag}: ganz unten, Mission 8 ganz sichtbar, ▼ aus, ▲ an ({a2}, {end})')
        # Mission per Tipp öffnen (nach dem Scrollen)
        s.tap('[data-a=level][data-v="1-7"]'); time.sleep(0.4)
        ok(s.ev("__app.ui.current") == 'levelcard' and s.ev("__app.ui.data.id") == '1-7', f'{tag}: Tipp auf 1-7 nach dem Scrollen öffnet die Missionskarte')
        jpg(s, f'missionskarte_1-7_{tag}')
        s.tap('[data-a=map]'); time.sleep(0.6)
        # waagrecht wischen (auf der Liste!) → nächste Welt, Liste scrollt nicht
        lr = s.ev("(() => { const r = document.querySelectorAll('.wcard .lv')[0].getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width}; })()")
        b0 = s.ev(SCROLL)
        swipe(s, lr['x'] + lr['w'] * 0.4, lr['y'], lr['x'] - lr['w'] * 0.6, lr['y'] + 5, steps=10)
        b1 = s.ev(SCROLL)
        ok(b1['card'] == 1 and abs(b1['top'] - b0['top']) < 2, f'{tag}: waagrecht wischen auf der Liste wechselt zur Welt 2 ({b0["card"]}→{b1["card"]}), Liste bleibt ({b0["top"]}→{b1["top"]})')
        swipe(s, lr['x'] - lr['w'] * 0.4, lr['y'], lr['x'] + lr['w'] * 0.6, lr['y'] - 5, steps=10)
        b2 = s.ev(SCROLL)
        ok(b2['card'] == 0, f'{tag}: zurück wischen → Welt 1 ({b2["card"]})')
        res[f'liste_{tag}'] = {'layout': L, 'start': tg, 'senkrecht': [a0, a1, a2], 'waagrecht': [b0, b1, b2]}
        # Sperr-Hinweis-Bild quer
        if tag == 'quer':
            s.ev("__app.progress.cur.levels = {}; __app.progress.save()"); win(s, ['1-1', '1-2'])
            s.ev("__game.show('map')"); time.sleep(0.5)
            s.ev("document.querySelector('.worlds').scrollLeft = document.querySelectorAll('.wcard')[1].offsetLeft - (innerWidth - document.querySelectorAll('.wcard')[1].clientWidth) / 2"); time.sleep(0.8)
            jpg(s, 'karte_sperre_quer')
        ok(s.errors == [], f'{tag}: keine Fehler ({s.errors[:3]})')
        s.close()

    # ================================================================ 6) Bilder: je Welt 2 neue Missionen im Spiel (Leicht, nach ein paar Sekunden Autopilot)
    print('6) Bilder neuer Missionen im Spiel')
    s = Session(pw, dpr=1.5); new_profile(s, 'Bild'); s.ev("__game.setQuality(1)")
    for lid in ['1-4', '1-6', '2-6', '2-8', '3-4', '3-6', '4-5', '4-8', '5-5', '5-7']:
        s.ev(f"__game.start('{lid}', 'leicht')"); s.ev("__game.autopilot(true)")
        t0 = s.ev("__app.t")
        while s.ev("__app.t") - t0 < (9 if lid in ('4-8', '5-7') else 6): time.sleep(0.1)
        s.ev("__game.autopilot(false)"); time.sleep(0.2)
        jpg(s, f'mission_{lid}')
    s.ev("__app.quit()")
    ok(s.errors == [], f'Bilder: keine Fehler ({s.errors[:3]})')
    s.close()

res['fails'] = fails; res['ok'] = not fails
json.dump(res, open('tests/out/v27_missionen.json', 'w'), indent=1, ensure_ascii=False)
print('ALLES OK' if not fails else f'FEHLER: {len(fails)}'); [print(' -', f) for f in fails]
