# Gemeinsame Test-Helfer (Playwright, Pixel-7-Emulation, WebGL auf der M1-GPU)
import time, json, os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:8471/')
PIXEL7 = dict(viewport={"width": 412, "height": 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True,
              user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36")
PIXEL7_LAND = dict(PIXEL7, viewport={"width": 915, "height": 412})
# WebGL headless über die echte GPU (ANGLE/Metal): Messung 27.09.2026, Level 2-1, Stufe Mittel:
# 60 statt 5 fps, 0,2 statt 3 CPU-Kerne, gleiches Bild. Bisher SwiftShader (reine CPU-Emulation).
# --enable-unsafe-swiftshader nur als Rückfall, falls Metal einmal fehlt (dann warnt _check_gl).
# SwiftShader erzwingen: WEBGL=swiftshader python3 tests/<test>.py
# Windows (rog17): ANGLE/D3D11 statt Metal (Plattform-Weiche, Mac unverändert)
GPU_ANGLE, GPU_NAME = ("d3d11", "Direct3D") if sys.platform == 'win32' else ("metal", "Metal")
GPU_ARGS = ["--use-angle=" + GPU_ANGLE, "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
SWIFT_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
ARGS = SWIFT_ARGS if os.environ.get('WEBGL') == 'swiftshader' else GPU_ARGS
GL_RENDERER = """(() => { const gl = __app.renderer.r.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info');
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })()"""
_gl_checked = False

class Session:
    def __init__(self, pw, device=PIXEL7, dpr=None, storage=None):
        # v2.9: BROWSER=open → Browser per `open` + CDP (wie tests/perf_gate.py): ohne die von der Queue geerbte macOS-
        # Zeitgeber-Drosselung (sonst ~8–15 Bilder/s headless). Standard bleibt der Kindprozess.
        if os.environ.get('BROWSER') == 'open' and sys.platform == 'darwin':
            from perf_gate import OffenerBrowser
            self.b = OffenerBrowser(pw, ARGS)
        else:
            self.b = pw.chromium.launch(args=ARGS)
        opts = dict(device)
        if dpr: opts['device_scale_factor'] = dpr
        if storage: opts['storage_state'] = storage
        self.ctx = self.b.new_context(**opts)
        self.pg = self.ctx.new_page()
        self.errors = []; self.console = []
        self.pg.on("pageerror", lambda e: self.errors.append("PAGEERROR " + str(e)))
        self.pg.on("console", lambda m: (self.console.append(m.type + ": " + m.text), self.errors.append("CONSOLE " + m.text) if m.type == "error" else None))
    def open(self, q='?nosw'):
        for attempt in range(2):
            try:
                self.pg.goto(BASE + 'index.html' + q + os.environ.get('QZUSATZ', ''))   # v2.9: QZUSATZ='&takt=0' u. ä. (A/B)
                self.pg.wait_for_function("window.__game && window.__app && window.__app.frames > 3", timeout=150000)
                self._check_gl()
                return
            except Exception:
                if attempt: raise
    def _check_gl(self):
        # einmal pro Testlauf: meldet, falls statt der GPU die CPU-Emulation rendert (still langsam)
        global _gl_checked
        if _gl_checked: return
        _gl_checked = True
        try: r = self.ev(GL_RENDERER)
        except Exception as e: r = 'unbekannt (' + str(e)[:80] + ')'
        if ARGS is GPU_ARGS and GPU_NAME not in str(r):
            print('WARNUNG WebGL läuft nicht auf der GPU:', r, file=sys.stderr, flush=True)
    def ev(self, js, arg=None):
        return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)
    def shot(self, name):
        os.makedirs('tests/shots', exist_ok=True)
        self.pg.screenshot(path=f'tests/shots/{name}.png')
    def tap(self, sel):
        el = self.pg.locator(sel).first
        el.wait_for(state='visible', timeout=20000)
        el.scroll_into_view_if_needed(); time.sleep(0.15)
        box = el.bounding_box()
        self.pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        time.sleep(0.25)
    def wait_audio(self, t=120):
        self.pg.wait_for_function("window.__app.audio.ready", timeout=t * 1000)
    def state(self):
        return self.ev("JSON.stringify(__game.state())")
    def close(self):
        self.b.close()
