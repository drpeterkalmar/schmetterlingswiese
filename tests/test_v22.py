# v2.2: alle Figuren ab Start · jede Freischaltung anziehen + rendern · v2.1-Profil lädt ohne Verlust · Freischalt-Karte
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
from test_ui import CHECK

OLD = {"v": 2, "current": "palt1", "settings": {"music": 0.5, "sfx": 0.8, "haptics": False, "control": "stick", "quality": "auto"},
  "profiles": [{"id": "palt1", "name": "Alt", "color": "#ff7eb6", "created": 1758900000000, "diff": "mittel",
    "look": {"char": "biene", "color": {"schmetterling": 3, "marienkaefer": 2, "biene": 1, "libelle": 0}, "pattern": "herzen", "hat": "krone"},
    "levels": {"1-1": {"leicht": {"stars": 3, "time": 51.2, "combo": 6}, "mittel": {"stars": 2, "time": 60, "combo": 4}}, "1-2": {"leicht": {"stars": 2, "time": 88, "combo": 3}}},
    "stats": {"loops": 4, "rolls": 7, "collected": 31}, "album": {"baer": 1758900000001, "capy": 1758900000002}, "badges": {"erstflug": 1758900000003},
    "daily": {"done": {"2026-09-26": True}}, "seen": {"tut": 1}, "lastWorld": "wiese"},
   {"id": "palt2", "name": "Zwei", "color": "#7cc4ff", "created": 1758900000000, "diff": "leicht",
    "look": {"char": "libelle", "color": {"schmetterling": 0, "marienkaefer": 0, "biene": 0, "libelle": 2}, "pattern": "monarch", "hat": "none"},
    "levels": {}, "stats": {}, "album": {}, "badges": {}, "daily": {"done": {}}, "seen": {}}]}
fails = []
def ok(cond, msg):
    if not cond: fails.append(msg)
    print(('  ok ' if cond else '  FEHLER ') + msg, flush=True)

def frames(s, n=2):
    f0 = s.ev("__app.frames"); t0 = time.time()
    while s.ev("__app.frames") < f0 + n and time.time() - t0 < 20: time.sleep(0.03)

with sync_playwright() as pw:
    # ---------------------------------------------------------------- 1) frisches Profil: alle Grundfiguren
    print('1) Frisches Profil – alle Grundfiguren, Farben, Muster, klassische Hüte frei')
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Neu'); s.tap('[data-a=create]')
    ok(s.ev("__app.progress.stars()") == 0, 'frisches Profil hat 0 Sterne')
    s.tap('[data-a=wardrobe]'); time.sleep(0.8)
    base = s.ev("(async () => (await import('./js/actors/characters.js')).CHARACTERS.filter(c => !c.stars).map(c => c.id))()")
    ok(len(base) >= 6, f'{len(base)} Grundfiguren ohne Sterne: {base}')
    for c in base:
        s.tap(f'[data-a=wchar][data-v={c}]'); frames(s)
        ok(s.ev("__app.player.critter.kind") == c and s.ev("__app.progress.cur.look.char") == c, f'Figur {c} gewählt und gebaut')
    locked = s.ev("[...document.querySelectorAll('[data-a=wchar].lock')].map(b => b.dataset.v)")
    ok(set(locked) == {'drache', 'einhorn', 'katze'}, f'gesperrt nur die verrückten Figuren: {locked}')
    free = s.ev("""(async () => { const C = await import('./js/actors/characters.js'); const P = __app.progress;
      return { pat: C.PATTERNS.every(p => P.isUnlocked('pattern', p.id)), col: P.isUnlocked('color', 'x'), hats: C.HATS.filter(h => !h.crazy).every(h => P.isUnlocked('hat', h.id)),
        crazyLocked: C.HATS.filter(h => h.crazy).every(h => !P.isUnlocked('hat', h.id)) }; })()""")
    ok(all(free.values()), f'Muster/Farben/klassische Hüte frei, verrückte gesperrt: {free}')
    s.tap('[data-a=wtab][data-v=farbe]'); s.tap('[data-a=wslot][data-v=b]'); s.tap('.sw >> nth=3')
    ok(s.ev("__app.player.critter.look.b") == 0xffb36b and s.ev("__app.progress.cur.look.per.marienkaefer === undefined || true"), 'Zweitfarbe per Palette gesetzt und am 3D-Modell')
    ok(s.errors == [], f'keine Fehler ({s.errors[:3]})')
    s.close()

    # ---------------------------------------------------------------- 2) jede Freischaltung: freischalten, anziehen, rendern
    print('2) Jede Freischaltung per Test-API freischalten, anziehen, 3D rendern')
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Alles'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    ul = json.loads(s.ev("JSON.stringify(__app.progress.unlockables().map(u => ({type: u.type, id: u.id, stars: u.stars, name: u.name})))"))
    ok(15 <= len(ul) <= 24, f'{len(ul)} Freischaltungen')
    stars = sorted(u['stars'] for u in ul)
    ok(max(stars) <= 135 and len(set(stars)) == len(stars), f'Stufen eindeutig und ≤ Max-Sterne: {stars}')
    for u in ul:
        lock0 = s.ev(f"__app.progress.isUnlocked('{u['type']}', '{u['id']}')")
        s.ev(f"__app.progress.cur.levels['t'] = {{leicht: {{stars: {u['stars']}}}}}; __app.progress.save()")
        lock1 = s.ev(f"__app.progress.isUnlocked('{u['type']}', '{u['id']}')")
        s.ev(f"__app.wearUnlock({json.dumps(u)}); __app.setLookFromProfile()")
        frames(s, 3)
        L = json.loads(s.ev("JSON.stringify({kind: __app.player.critter.kind, look: __app.player.critter.look, fun: __app.progress.cur.fun, calls: __game.info().calls})"))
        worn = (L['kind'] == u['id']) if u['type'] == 'char' else L['fun'].get(u['id']) if u['type'] == 'fun' else (L['look']['size'] == 'xl') if u['type'] == 'size' else L['look'][u['type']] == u['id']
        ok(not lock0 and lock1 and worn and L['calls'] > 10, f"{u['stars']:>3} ⭐ {u['type']}:{u['id']} gesperrt→frei, angezogen, gerendert ({L['calls']} Draw-Calls)")
        s.ev("__app.progress.cur.levels = {}; __app.progress.save()")
    # alles gleichzeitig tragen + im Level fliegen (Draw-Call-Budget)
    s.ev("__app.progress.cur.levels['t'] = {leicht: {stars: 135}}; __app.progress.setLook({hat: 'propeller', extra: 'umhang', skin: 'disco', trail: 'schweif', size: 'xl'}); __app.setLookFromProfile()")
    s.ev("__game.start('2-1', 'mittel')"); s.ev("__game.autopilot(true)"); time.sleep(3)
    calls = s.ev("__game.info().calls"); ok(calls < 150, f'Draw-Calls mit vollem Outfit im Level 2-1: {calls} (< 150)')
    s.ev("__game.autopilot(false)")
    # Werkstatt baut bei jedem Tipp neu: 2 × 60 Zufalls-Outfits → Geometrien/Programme dürfen nicht wachsen
    s.ev("__app.quit()"); time.sleep(0.5)
    mem = []
    for rnd in range(2):
        s.ev("""(async () => { const C = await import('./js/actors/characters.js'); let seed = 7;
          const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
          for (let i = 0; i < 60; i++) { const k = C.CHARACTERS[i % C.CHARACTERS.length].id; __app.progress.cur.look.char = k;
            __app.progress.setLook(C.randomLook(k, () => true, r)); __app.setLookFromProfile(); await new Promise(res => requestAnimationFrame(res)); } })()""")
        frames(s, 3)
        mem.append(json.loads(s.ev("JSON.stringify({g: __app.renderer.r.info.memory.geometries, t: __app.renderer.r.info.memory.textures, p: __app.renderer.r.info.programs.length})")))
    ok(mem[0] == mem[1], f'keine Lecks beim Umziehen (Runde 1 vs 2: {mem})')
    ok(s.errors == [], f'keine Fehler ({s.errors[:3]})')
    s.close()

    # ---------------------------------------------------------------- 3) altes v2.1-Profil
    print('3) Profil alter Struktur (v2.1-JSON) lädt ohne Verlust')
    s = Session(pw, dpr=1)
    s.ctx.add_init_script("if (!localStorage.getItem('schmetterlingswiese.v2')) localStorage.setItem('schmetterlingswiese.v2', " + json.dumps(json.dumps(OLD)) + ")")
    s.open()
    r = json.loads(s.ev("""(async () => { const C = await import('./js/actors/characters.js'); const P = __app.progress, p = P.cur, q = P.profiles[1];
      return JSON.stringify({ cur: p.id, name: p.name, stars: P.stars(p), levels: p.levels, stats: p.stats, album: p.album, badges: p.badges, daily: p.daily, seen: p.seen,
        settings: P.settings, oldLook: { color: p.look.color, pattern: p.look.pattern, hat: p.look.hat }, char: p.look.char, per: p.look.per,
        kind: __app.player.critter.kind, a: __app.player.critter.look.a, c: __app.player.critter.look.c, hat: !!__app.player.critter.hat,
        biene1: C.COLORS.biene[1], schm3: C.COLORS.schmetterling[3], lib2: C.COLORS.libelle[2], q: P.lookOf(q), qchar: q.look.char }); })()"""))
    O = OLD['profiles'][0]
    ok(r['cur'] == 'palt1' and r['name'] == 'Alt', 'aktuelles Profil + Name erhalten')
    ok(r['stars'] == 3 + 2 + 2 + 1, f"Sterne erhalten ({r['stars']})")
    ok(r['levels'] == O['levels'] and r['stats'] == O['stats'] and r['album'] == O['album'] and r['badges'] == O['badges'] and r['daily'] == {'done': {'2026-09-26': True}} and r['seen'] == O['seen'], 'Level, Statistik, Album, Abzeichen, Tagesaufgaben erhalten')
    ok(r['settings'] == OLD['settings'], 'Einstellungen erhalten')
    ok(r['oldLook'] == {'color': O['look']['color'], 'pattern': 'herzen', 'hat': 'krone'}, 'alte Aussehen-Felder unangetastet')
    ok(r['char'] == 'biene' and r['kind'] == 'biene', 'gewählte Figur (Biene) bleibt')
    ok(r['a'] == r['biene1']['a'] and r['c'] == r['biene1']['c'] and r['hat'], 'Biene trägt ihre alte Farbe (Zuckerwatte) und die Krone')
    ok(all(r['per'][k]['hat'] == 'krone' for k in ['schmetterling', 'marienkaefer', 'biene', 'libelle']), 'Krone auf alle vier alten Figuren übernommen')
    ok(r['per']['schmetterling']['a'] == r['schm3']['a'] and r['per']['schmetterling']['pattern'] == 'herzen', 'Schmetterling: Farbe Flieder + Muster Herzen übernommen')
    ok(r['qchar'] == 'libelle' and r['q']['a'] == r['lib2']['a'], 'zweites Profil: Libelle in Rubin übernommen')
    s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    r2 = json.loads(s.ev("JSON.stringify({stars: __app.progress.stars(), a: __app.player.critter.look.a, lv: __app.progress.cur.lv})"))
    ok(r2['stars'] == r['stars'] and r2['a'] == r['a'] and r2['lv'] == 22, 'nach Neuladen identisch (Migration idempotent)')
    ok(s.errors == [], f'keine Fehler ({s.errors[:3]})')
    s.close()

    # ---------------------------------------------------------------- 4) Freischalt-Moment im echten Ablauf
    print('4) Level gewinnen → Überraschung → Freischalt-Karte → Gleich anziehen')
    for dev, tag in [(PIXEL7, 'P'), (PIXEL7_LAND, 'L')]:
        s = Session(pw, device=dev, dpr=1)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Karte'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(0)")
        s.ev("__app.progress.cur.levels['1-1'] = {leicht: {stars: 1}}; __app.progress.save()")
        s.ev("__game.start('1-2', 'leicht')")
        for i in range(60):
            if json.loads(s.state())['game'] == 'won': break
            s.ev("__game.step()"); frames(s, 2)
        t0 = time.time()
        while s.ev("__app.ui.current") != 'result' and time.time() - t0 < 60: time.sleep(0.2)
        time.sleep(2.5)
        un = s.ev("__app.lastResult.unlocks.map(u => u.id)")
        ok(len(un) >= 1, f'{tag}: Freischaltungen nach dem Sieg: {un}')
        s.shot(f'v22/freischalt_{tag}_ergebnis')
        ok(s.ev(CHECK) == [], f'{tag}: Ergebnis-Karte Touch-Ziele/Ränder ok')
        s.tap('[data-a=surprise]'); time.sleep(2.5)
        s.shot(f'v22/freischalt_{tag}_karte')
        ok(s.ev("__app.ui.current") == 'unlock' and s.ev(CHECK) == [], f'{tag}: Freischalt-Karte sichtbar, Touch-Ziele ok')
        first = s.ev("__app.ui.data.list[0]")
        prev = s.ev("__app.player.critter.look")
        ok(prev.get(first['type']) == first['id'] or first['type'] in ('char', 'fun', 'size'), f"{tag}: 3D-Vorschau trägt schon {first['id']}")
        s.tap('[data-a=unlwear]'); time.sleep(0.8)
        L = s.ev("__app.progress.lookOf()")
        ok(L.get(first['type']) == first['id'], f"{tag}: nach „Gleich anziehen“ gespeichert ({first['type']}={L.get(first['type'])})")
        while s.ev("__app.ui.current") == 'unlock': s.tap('[data-a=unlskip]'); time.sleep(0.6)
        ok(s.ev("__app.ui.current") in ('levelcard', 'map'), f"{tag}: danach weiter zur {s.ev('__app.ui.current')}")
        ok(s.errors == [], f'{tag}: keine Fehler ({s.errors[:3]})')
        s.close()

print('ALLES OK' if not fails else f'FEHLER: {len(fails)}'); [print(' -', f) for f in fails]
