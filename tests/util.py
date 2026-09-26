# Gemeinsame Test-Helfer (Playwright, Pixel-7-Emulation, SwiftShader-WebGL)
import time, json, os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:8471/')
PIXEL7 = dict(viewport={"width": 412, "height": 915}, device_scale_factor=2.625, is_mobile=True, has_touch=True,
              user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36")
PIXEL7_LAND = dict(PIXEL7, viewport={"width": 915, "height": 412})
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

class Session:
    def __init__(self, pw, device=PIXEL7, dpr=None, storage=None):
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
        self.pg.goto(BASE + 'index.html' + q)
        self.pg.wait_for_function("window.__game && window.__app && window.__app.frames > 3", timeout=90000)
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
