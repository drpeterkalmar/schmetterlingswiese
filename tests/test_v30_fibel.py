# v3.0 Kunstflug-Fibel (im 📖 Album): alle Figuren mit Name, Untertitel und einem Satz; „Vorführen“ fliegt die Figur im
# Menü vor (Zuschauer-Kamera, Rauchspur) und kehrt danach zur Fibel zurück. Dazu Einstellungen 🎬/⚡ (umschalten, gespeichert).
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/v30'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
res = {}
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'Sternchen'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.tap('[data-a=album]'); s.tap('[data-a=fibel]')
    res['items'] = s.ev("document.querySelectorAll('.card [data-a=fibel][data-v]').length")
    s.tap('[data-a=fibel][data-v=hammerhead]')
    res['fact'] = s.ev("document.querySelector('.fact').textContent")
    res['demo_btn'] = s.ev("!!document.querySelector('[data-a=demo]')")
    s.pg.screenshot(path=f'{OUT}/fibel.png')
    s.tap('[data-a=demo]')
    time.sleep(0.3)
    res['demo_on'] = s.ev("!!(__app.demo && __app.player.stunt && __app.player.stunt.id === 'hammerhead')")
    k = 0; t1 = time.time(); clear = 9
    while s.ev("!!__app.demo") and time.time() - t1 < 30:
        p = s.ev("__app.player.stunt ? __app.player.stunt.p : 1")
        clear = min(clear, s.ev("(() => { const p = __app.player.pos; return p.y - __H(p.x, p.z); })()") if s.ev("!!window.__H") else clear)
        if k < 4 and p >= 0.15 + k * 0.22:
            s.pg.screenshot(path=f'{OUT}/fibel_demo_{k}.png'); k += 1
        time.sleep(0.05)
    res['back_to_fibel'] = s.ev("__app.ui.current") == 'fibel' and s.ev("!__app.demo")
    res['sel_kept'] = s.ev("!!document.querySelector('.item.sel[data-v=hammerhead]')")
    res['shots'] = k
    # Einstellungen: Clip an/aus, Blitze reduzieren
    s.ev("__game.show('settings')"); time.sleep(0.3)
    e0, b0 = s.ev("__app.settings.edit"), s.ev("__app.settings.blitze")
    s.tap('[data-a=tedit]'); s.tap('[data-a=tblitz]')
    res['settings'] = {'edit': [e0, s.ev("__app.settings.edit")], 'blitze': [b0, s.ev("__app.settings.blitze")],
                       'saved': s.ev("Object.keys(localStorage).some(k => /\"edit\":false/.test(localStorage.getItem(k) || '') && /\"blitze\":\"wenig\"/.test(localStorage.getItem(k) || ''))")}
    s.pg.screenshot(path=f'{OUT}/einstellungen.png')
    res['errors'] = s.errors[:5]
    s.close()
st = res['settings']
res['ok'] = (res['items'] >= 13 and 'Hammer' in res['fact'] and res['demo_btn'] and res['demo_on'] and res['back_to_fibel'] and res['sel_kept']
             and res['shots'] >= 3 and st['edit'] == [True, False] and st['blitze'] == ['normal', 'wenig'] and st['saved'] and not res['errors'])
print(json.dumps(res, indent=1, ensure_ascii=False))
print('ok', res['ok'])
