# v2.5 Wettflüge (2-3 Flora, 3-3 Libellen-Rennen): kein Glitzerstern, Sterne nur über Zeiten
# (⭐ gewonnen · ⭐ schneller als par · ⭐ Blitzzeit = 0,8·par), auf allen Stufen (Schwer: Blitzzeit statt Kombo, Zeitlimit
# bleibt). Level-Karte und Ergebnis zeigen die Zeitziele; gespeicherte Sterne werden nie herabgestuft; andere Level
# unverändert (Glitzerstern, Schwer-Kombo). Bilder: tests/shots/v25/wettflug_karte|ergebnis_<hoch|quer>.jpg
# --flieger: zusätzlich fliegt der Level-Test-Flieger (Autopilot) jede Stufe echt (Rivalin geparkt / aktiv) → Blitzzeit-Eichung
import time, json, sys, os, re
sys.path.insert(0, 'tests')
from util import *
from PIL import Image
OUT = 'tests/shots/v25'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
DIFFS = ['leicht', 'mittel', 'schwer']
res = {'karte': {}, 'sterne': {}, 'glitzer': {}, 'flieger': {}}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def card_text(s, lid, diff):
    s.ev(f"__app.setDiff('{diff}')"); s.ev(f"__game.show('levelcard', {{id: '{lid}'}})"); time.sleep(0.3)
    return s.ev("document.querySelector('.goals').innerText")

def goals(s, lid, diff):
    return s.ev(f"import('./js/game/levels.js').then(m => m.timeGoals(m.levelById('{lid}'), '{diff}'))")

def win_with_time(s, lid, diff, t):
    s.ev(f"__game.start('{lid}', '{diff}')")
    t0 = time.time()
    while s.ev("__app.game.state") == 'countdown' and time.time() - t0 < 20: time.sleep(0.1)
    for k in range(40):
        if s.ev("__app.game.tasks[0].max - __app.game.tasks[0].cur") <= 1: break
        s.ev("__game.step()"); sim_wait(s, 0.03)
    s.ev(f"__app.game.time = {t}; __app.game.maxCombo = 99")  # riesige Kombo: darf bei Wettflügen (auch Schwer) nichts bringen
    s.ev("__game.step()")
    t0 = time.time()
    while s.ev("__app.game.state") not in ('won', 'failed') and time.time() - t0 < 10: time.sleep(0.03)
    return s.ev("({state: __app.game.state, stars: __app.game.stars, time: __app.game.time, saved: __app.progress.levelStars(__app.game.level.id, __app.game.diffId), glitter: !!__app.game.glitter})")

with sync_playwright() as pw:
    for ori, dev in [('hoch', PIXEL7), ('quer', PIXEL7_LAND)]:
        s = Session(pw, device=dev, dpr=1.5)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Renner'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(0)")
        s.ev("Object.assign(__app.progress.cur, {}); __app.progress.cur.levels = {}")
        if ori == 'hoch':
            # --- Level-Karten: Zeitziele statt Glitzerstern (alle Stufen), andere Level unverändert
            for lid in ['2-3', '3-3']:
                for d in DIFFS:
                    g = goals(s, lid, d); txt = card_text(s, lid, d)
                    ok = ('Rennen gewinnen' in txt and f"Schneller als {g['par']} Sekunden" in txt and f"Blitzzeit: schneller als {g['blitz']} Sekunden" in txt
                          and 'Glitzerstern' not in txt and 'Kombo' not in txt and (d != 'schwer' or f"Zeitlimit: {g['limit']} Sekunden" in txt)
                          and abs(g['blitz'] - 0.8 * g['par']) <= 1.01 and g['blitz'] < g['par'])
                    res['karte'][f'{lid}_{d}'] = {'ok': ok, 'goals': g, 'text': txt}
                    print('karte', lid, d, 'ok' if ok else 'FEHLER', g, repr(txt), flush=True)
            for d in DIFFS:
                txt = card_text(s, '1-1', d)
                ok = ('Aufgabe schaffen' in txt and ('Kombo' in txt if d == 'schwer' else 'Glitzerstern' in txt) and 'Blitzzeit' not in txt)
                res['karte'][f'1-1_{d}'] = {'ok': ok, 'text': txt}
                print('karte 1-1', d, 'ok' if ok else 'FEHLER', repr(txt), flush=True)
            # Zeitlimit Schwer unverändert (= v2.4: round(par · 1,2 · 1,5)): 2-3 → 144 s, 3-3 → 153 s
            res['limit'] = {lid: goals(s, lid, 'schwer')['limit'] for lid in ['2-3', '3-3']}
            res['limit_ok'] = res['limit'] == {'2-3': 144, '3-3': 153}
            print('limit', res['limit'], res['limit_ok'], flush=True)
            # --- Glitzerstern: in Wettflügen nie, sonst wie bisher (nicht auf Schwer)
            for lid in ['2-3', '3-3', '1-1', '2-1']:
                for d in DIFFS:
                    s.ev(f"__game.start('{lid}', '{d}')"); sim_wait(s, 0.2)
                    has = s.ev("!!__app.game.glitter"); want = lid not in ('2-3', '3-3') and d != 'schwer'
                    res['glitzer'][f'{lid}_{d}'] = {'has': has, 'ok': has == want}
            print('glitzer', {k: v['has'] for k, v in res['glitzer'].items()}, flush=True)
            # --- Sterne nur über Zeiten, auf allen Stufen (Kombo egal), nie herabstufen
            for lid in ['2-3', '3-3']:
                for d in DIFFS:
                    g = goals(s, lid, d)
                    s.ev("__app.progress.cur.levels = {}; __app.progress.save()")
                    cases = [('blitz', g['blitz'] - 1, 3), ('par', (g['blitz'] + g['par']) / 2, 2), ('langsam', g['par'] + 5, 1), ('wieder_blitz', g['blitz'] - 0.5, 3)]
                    out = {}
                    for name, t, want in cases:
                        r = win_with_time(s, lid, d, t)
                        out[name] = {**r, 'want': want, 'ok': r['state'] == 'won' and r['stars'] == want and not r['glitter']}
                    # gespeichert bleibt das Beste: nach 3 → 2 → 1 immer noch 3
                    out['nie_herab'] = out['par']['saved'] == 3 and out['langsam']['saved'] == 3
                    # Kombo zählt nicht (win_with_time setzt Kombo 99): „langsam“ bleibt bei 1 Stern, auch auf Schwer
                    out['kombo_egal'] = out['langsam']['stars'] == 1
                    res['sterne'][f'{lid}_{d}'] = out
                    print('sterne', lid, d, {k: (v['stars'] if isinstance(v, dict) else v) for k, v in out.items()}, flush=True)
            # alte gespeicherte Sterne bleiben (Profil aus v2.4 mit 3 Sternen durch Glitzerstern)
            s.ev("__app.progress.cur.levels = {'2-3': {leicht: {stars: 3, time: 40, combo: 5}}}; __app.progress.save()")
            r = win_with_time(s, '2-3', 'leicht', 200)
            res['alt_bleibt'] = {'stars': r['stars'], 'saved': r['saved'], 'ok': r['stars'] == 1 and r['saved'] == 3}
            print('alt_bleibt', res['alt_bleibt'], flush=True)
        # --- Bilder: Level-Karte + Ergebnis (Blitzzeit geschafft) hoch und quer
        s.ev("__app.progress.cur.levels = {}; __app.progress.save()")
        s.ev("__app.quit()"); time.sleep(1.0)  # wie echt: Level-Karte von der Weltkarte aus
        s.ev("__app.setDiff('mittel')"); s.ev("__game.show('levelcard', {id: '2-3'})"); time.sleep(0.8)
        s.pg.screenshot(path=f'{OUT}/wettflug_karte_{ori}.png')
        g = goals(s, '2-3', 'mittel')
        r = win_with_time(s, '2-3', 'mittel', g['blitz'] - 3.4)
        t0 = time.time()
        while s.ev("__app.ui.current") != 'result' and time.time() - t0 < 20: time.sleep(0.1)
        time.sleep(2.4)
        s.pg.screenshot(path=f'{OUT}/wettflug_ergebnis_{ori}.png')
        facts = s.ev("document.querySelector('.facts').innerText")
        res[f'ergebnis_{ori}'] = {'facts': facts, 'ok': 'Blitzzeit' in facts and 'Glitzerstern' not in facts and 'Rennen gewonnen' in facts and r['stars'] == 3}
        print('ergebnis', ori, res[f'ergebnis_{ori}'], flush=True)
        for n in ['karte', 'ergebnis']:
            f = f'{OUT}/wettflug_{n}_{ori}.png'; Image.open(f).convert('RGB').save(f[:-4] + '.jpg', quality=88); os.remove(f)
        # --- Level-Test-Flieger (Autopilot) fliegt echt: reine Zeit (Rivalin geparkt) und gegen die Rivalin
        if '--flieger' in sys.argv and ori == 'hoch':
            for lid in ['2-3', '3-3']:
                for d in DIFFS:
                    g = goals(s, lid, d)
                    for mode in (['frei', 'rennen'] if d != 'schwer' else ['frei', 'rennen']):
                        s.ev(f"__game.start('{lid}', '{d}')")
                        if mode == 'frei': s.ev("__app.game.race.start = () => {}")
                        s.ev("__game.autopilot(true)")
                        t0 = time.time()
                        while s.ev("__app.game.state") not in ('won', 'failed') and time.time() - t0 < 200: time.sleep(0.2)
                        st = s.ev("({g: __app.game.state, t: +__app.game.time.toFixed(1), stars: __app.game.stars || 0})")
                        s.ev("__game.autopilot(false)")
                        res['flieger'][f'{lid}_{d}_{mode}'] = {**st, 'par': g['par'], 'blitz': g['blitz'], 'unter_blitz': st['t'] <= g['blitz']}
                        print('flieger', lid, d, mode, res['flieger'][f'{lid}_{d}_{mode}'], flush=True)
        res[f'errors_{ori}'] = s.errors[:5]
        s.close()

ok = (all(v['ok'] for v in res['karte'].values()) and res['limit_ok'] and all(v['ok'] for v in res['glitzer'].values())
      and all(all(x['ok'] for x in v.values() if isinstance(x, dict)) and v['nie_herab'] and v.get('kombo_egal', True) for v in res['sterne'].values())
      and res['alt_bleibt']['ok'] and res['ergebnis_hoch']['ok'] and res['ergebnis_quer']['ok']
      and all(v['unter_blitz'] for k, v in res['flieger'].items() if k.endswith('_frei'))
      and not res['errors_hoch'] and not res['errors_quer'])
res['ok'] = ok
json.dump(res, open('tests/out/v25_wettflug.json', 'w'), indent=1)
print('errors', res['errors_hoch'], res['errors_quer'])
print('ok', ok)
