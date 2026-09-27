# Steuerung (Zonen, Joystick, Tastatur) + PWA (Installierbarkeit, Offline-Start über Service-Worker)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
res = {}
with sync_playwright() as pw:
    # --- Zonen + Joystick per echten Touch-Events (CDP), Hochformat
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'T'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)"); s.ev("__game.start('1-1', 'leicht')"); time.sleep(1)
    cdp = s.ctx.new_cdp_session(s.pg)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
    y0 = s.ev("__app.player.yaw")
    touch('touchStart', [(40, 500)]); time.sleep(1.2); r1 = s.ev("[__app.input.rawTurn, __app.input.rawClimb]"); zon = s.ev("document.querySelector('.zl').classList.contains('on')"); touch('touchEnd', [])
    y1 = s.ev("__app.player.yaw")
    res['zone_left'] = {'raw': r1, 'yaw_delta': round(y1 - y0, 3), 'zone_lit': zon}
    h0 = s.ev("__app.player.pos.y")
    touch('touchStart', [(206, 200)]); time.sleep(1.2); r2 = s.ev("[__app.input.rawTurn, __app.input.rawClimb]"); touch('touchEnd', [])
    res['zone_up'] = {'raw': r2, 'climb_delta': round(s.ev("__app.player.pos.y") - h0, 2)}
    # Multitouch: rechts + unten gleichzeitig
    touch('touchStart', [(380, 450), (206, 800)]); time.sleep(0.6); r3 = s.ev("[__app.input.rawTurn, __app.input.rawClimb]"); touch('touchEnd', [])
    res['zone_multi'] = r3
    # Ein Finger ohne Loslassen: links halten, dann hochschieben (steigen), dann runterschieben (sinken)
    touch('touchStart', [(40, 500)]); time.sleep(0.3)
    touch('touchMove', [(40, 420)]); time.sleep(0.5); r5a = s.ev("[__app.input.rawTurn, __app.input.rawClimb]")
    touch('touchMove', [(40, 560)]); time.sleep(0.5); r5b = s.ev("[__app.input.rawTurn, __app.input.rawClimb]")
    touch('touchMove', [(206, 560)]); time.sleep(0.3); r5c = s.ev("[__app.input.rawTurn, __app.input.rawClimb]")
    touch('touchEnd', [])
    res['one_finger_slide'] = {'left_up': r5a, 'left_down': r5b, 'mid_down': r5c,
                               'ok': r5a[0] == -1 and r5a[1] > 0.9 and r5b[0] == -1 and r5b[1] < -0.9 and r5c[0] == 0 and r5c[1] < 0}
    # Stunt-Knopf
    b = s.pg.locator('#bLoop').bounding_box()
    touch('touchStart', [(b['x'] + 40, b['y'] + 40)]); time.sleep(0.1); touch('touchEnd', []); time.sleep(0.4)
    res['loop_button'] = s.ev("!!__app.player.stunt || __app.player.stats.loops > 0")
    # Joystick
    s.ev("__app.setSetting('control', 'stick')")
    touch('touchStart', [(120, 700)]); touch('touchMove', [(120 + 50, 700 - 40)]); time.sleep(0.8)
    r4 = s.ev("[__app.input.rawTurn, __app.input.rawClimb]"); stickvis = s.ev("getComputedStyle(document.getElementById('stick')).opacity"); s.shot('input_stick'); touch('touchEnd', [])
    res['stick'] = {'raw': r4, 'visible': stickvis}
    s.ev("__app.setSetting('control', 'zones')")
    res['errors_touch'] = s.errors[:5]
    s.close()
    # --- Tastatur (Desktop)
    s = Session(pw, device=dict(viewport={'width': 1280, 'height': 720}), dpr=1)
    s.open(); s.pg.mouse.click(640, 360); s.pg.fill('input.name', 'K'); s.pg.keyboard.press('Enter'); time.sleep(0.8)
    s.ev("__game.setQuality(0)"); s.ev("__game.start('1-1', 'leicht')"); time.sleep(1)
    s.pg.keyboard.down('ArrowLeft'); time.sleep(0.6); rk = s.ev("[__app.input.rawTurn, __app.input.rawClimb]"); s.pg.keyboard.up('ArrowLeft')
    s.pg.keyboard.press('Space'); time.sleep(0.3); lk = s.ev("!!__app.player.stunt")
    time.sleep(1.8); s.pg.keyboard.press('KeyP'); time.sleep(0.5); pk = s.ev("__app.ui.current")
    res['keyboard'] = {'left': rk, 'space_loop': lk, 'p_pause': pk, 'enter_created': s.ev("!!__app.progress.cur")}
    res['errors_kb'] = s.errors[:5]
    s.close()
    # --- PWA: Installierbarkeit + Offline
    b = pw.chromium.launch(args=ARGS)
    ctx = b.new_context(**PIXEL7)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    navs = []
    pg.on('framenavigated', lambda f: navs.append(f.url))
    pg.goto(BASE + 'index.html')
    pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
    time.sleep(6)
    res['navigations_first_visit'] = len(navs)
    cdp = ctx.new_cdp_session(pg)
    try: res['installability_errors'] = cdp.send('Page.getInstallabilityErrors')
    except Exception as e: res['installability_errors'] = str(e)
    res['manifest'] = cdp.send('Page.getAppManifest').get('errors')
    pg.reload(); pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    res['sw_controlled'] = pg.evaluate("!!navigator.serviceWorker.controller")
    res['caches'] = pg.evaluate("caches.keys()")
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    res['offline_boot'] = pg.evaluate("JSON.stringify({frames: __app.frames, screen: __app.ui.current, errors: window.__errors})")
    res['pwa_errors'] = errs[:5]
    b.close()
print(json.dumps(res, indent=1, ensure_ascii=False))
json.dump(res, open('tests/out/input_pwa_report.json', 'w'), indent=1, ensure_ascii=False)
