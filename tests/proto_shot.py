import sys, time
from playwright.sync_api import sync_playwright
args = sys.argv[1:]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width":915,"height":412}, device_scale_factor=1)
    pg = ctx.new_page()
    logs=[]
    pg.on("console", lambda m: logs.append(m.type+": "+m.text))
    pg.on("pageerror", lambda e: logs.append("PAGEERR: "+str(e)))
    for a in args:
        name, q = a.split('=',1) if '=' in a else (a, '')
        pg.goto(f"http://localhost:8471/{q}" if q.endswith(".html") or ".html?" in q else f"http://localhost:8471/proto.html?{q}")
        pg.wait_for_function("window.__frames>3", timeout=60000)
        time.sleep(1.0)
        pg.screenshot(path=f"tests/shots/proto_{name}.png")
        print(name, pg.evaluate("JSON.stringify(window.__info)"), pg.evaluate("window.__errors"))
    for l in logs[:30]: print(l)
    b.close()
