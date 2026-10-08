# v2.9 E2: Kern-Autopilot im echten Browser (Vorlage stuntbahn/tests/test_autopilot.py). Künstliche Arbeit je Bild über
# den Test-Haken __app.testLast (ms), Level 1-1 mit Test-Autopilot, Grafik „Automatisch“, Handy quer (Start Mittel).
#   1. ohne Last: in den ersten 10 s kein Schritt nach unten
#   2. schwere Last: erster Schritt nach unten in ≤ 3 s
#   3. Last weg: erster Schritt nach oben in ≤ 3 s, danach wieder volle Skala + Deko (Stufe: maxTier – eine einmal zu
#      langsame Stufe kommt in der Sitzung nicht wieder, wie bis v2.8)
#   4. Last an der Kante: kein Pendeln (≤ 3 Richtungswechsel in 40 s)
#   5. Kurzmessung beim allerersten Laden (frisches Profil): Dauer, Ergebnis; zweiter Besuch nutzt das gemerkte Gerät
#   6. 0 Fehler
# Browser per `open` (perf_gate.OffenerBrowser), sonst drosselt macOS die Zeitgeber der Queue auf ~15 Bilder/s.
import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_gate import OffenerBrowser, Server, profil, GPU_ARGS, REPO
from playwright.sync_api import sync_playwright

fails = []
def check(c, m):
    print(('OK   ' if c else 'FEHLER ') + m, flush=True)
    if not c: fails.append(m)

ZUSTAND = "(() => { const i = __game.info(); return { t: performance.now() / 1000, ap: i.autopilot, log: i.apLog, tier: i.tier, skala: i.skala }; })()"

def warte_log(pg, bed, max_s):
    t0 = pg.evaluate("performance.now() / 1000"); n0 = pg.evaluate("__game.info().autopilot.aenderungen")
    while True:
        z = pg.evaluate(ZUSTAND)
        if z['ap']['aenderungen'] > n0:
            for e in z['log'][-(z['ap']['aenderungen'] - n0):]:
                if bed(e): return e, z['t'] - t0
            n0 = z['ap']['aenderungen']
        if z['t'] - t0 > max_s: return None, max_s
        time.sleep(0.1)

with Server(REPO) as srv, sync_playwright() as pw:
    b = OffenerBrowser(pw, GPU_ARGS)
    try:
        ctx = b.new_context(**profil('quer', 2.625)); pg = ctx.new_page(); errors = []
        pg.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: errors.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        # 5. Kurzmessung: frisches Profil, erster Besuch
        t0 = time.time()
        pg.goto(srv.base + 'index.html?nosw')
        pg.wait_for_function('window.__app && window.__app.frames > 3', timeout=120000)
        t_bereit = time.time() - t0
        pg.wait_for_function('__game.info().startProbe', timeout=30000)
        sp = pg.evaluate('__game.info().startProbe'); t_probe = time.time() - t0
        check(sp and not sp.get('gespeichert') and 0.6 <= sp['skala'] <= 1, f'Kurzmessung erster Besuch: {json.dumps(sp)}, fertig {t_probe:.1f} s nach dem Laden (bereit nach {t_bereit:.1f} s)')
        pg.reload(); pg.wait_for_function('window.__app && window.__app.frames > 3', timeout=120000)
        sp2 = pg.evaluate('__game.info().startProbe')
        check(sp2 and sp2.get('gespeichert'), f'zweiter Besuch: gemerktes Gerät {json.dumps(sp2)}')
        pg.evaluate("__game.progress.create('AP'); __game.setQuality('auto'); __game.start('1-1', 'leicht'); __game.autopilot(true)")
        z0 = pg.evaluate(ZUSTAND)
        print('Start', json.dumps(z0['ap'], ensure_ascii=False), 'Stufe', z0['tier'])
        # 1. ohne Last 10 s
        time.sleep(10)
        z = pg.evaluate(ZUSTAND)
        runter = [e for e in (z['log'] or []) if e['richtung'] < 0]
        check(not runter, f'ohne Last 10 s: kein Schritt nach unten (Log {runter[:3]}), Bildrate {z["ap"]["fps"]}, Stufe {z["tier"]}, Skala {z["skala"]}, GPU {z["ap"]["gpu"]} ms')
        # 2. schwere Last (45 ms je Bild ≈ 20 Bilder/s)
        pg.evaluate("__app.testLast = 45")
        e, dt = warte_log(pg, lambda e: e['richtung'] < 0, 8)
        check(e is not None and dt <= 3.0, f'schwere Last: erster Schritt nach unten nach {dt:.2f} s ({e})')
        time.sleep(20)
        z = pg.evaluate(ZUSTAND)
        print('  nach 20 s Last:', json.dumps(z['ap']['stufen']), 'Skala', z['skala'], 'Engpass', z['ap']['engpass'], 'Stufe', z['tier'], flush=True)
        # 3. Last weg
        pg.evaluate("__app.testLast = 0")
        e, dt = warte_log(pg, lambda e: e['richtung'] > 0, 8)
        check(e is not None and dt <= 3.0, f'Last weg: erster Schritt nach oben nach {dt:.2f} s ({e})')
        t1 = time.time()
        while time.time() - t1 < 90:
            z = pg.evaluate(ZUSTAND); st = z['ap']['stufen']
            if st.get('deko') == 1 and z['skala'] >= z['ap']['bereich'][1] - 1e-6: break
            time.sleep(0.5)
        check(st.get('deko') == 1 and z['skala'] >= z['ap']['bereich'][1] - 1e-6, f'wieder volle Skala + Deko nach {time.time() - t1:.1f} s: Stufe {z["tier"]}, {st}, Skala {z["skala"]}')
        # 4. Kante: Last so, dass das Bild knapp an den Bildtakt kommt
        pg.evaluate("__app.testLast = 11")
        time.sleep(5)
        n0 = pg.evaluate("__game.info().autopilot.aenderungen")
        time.sleep(40)
        z = pg.evaluate(ZUSTAND)
        n = z['ap']['aenderungen'] - n0
        log = (z['log'] or [])[-n:] if n else []
        richt = [e['richtung'] for e in log]
        wechsel = sum(1 for a, c in zip(richt, richt[1:]) if a != c)
        check(wechsel <= 3, f'Kante (11 ms Last), 40 s: {n} Änderungen, {wechsel} Richtungswechsel: {[(e["was"], e["richtung"]) for e in log]}')
        pg.evaluate("__app.testLast = 0")
        check(not errors, f'0 Fehler ({errors[:3]})')
        ctx.close()
    finally:
        b.close()
print('ALLE OK' if not fails else f'{len(fails)} FEHLER')
sys.exit(1 if fails else 0)
