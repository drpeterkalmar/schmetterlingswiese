# Studio-Aufnahmen einer Figur (4 Blickwinkel → 2×2-Raster) für die Sichtprüfung (v2.2)
import time, os, json
from PIL import Image
from util import *

STUDIO = dict(PIXEL7, viewport={"width": 520, "height": 520}, device_scale_factor=1)
VIEWS = [('vorn', 0.55, 0.35, 2.6), ('seite', 1.57, 0.2, 2.8), ('hinten', 2.75, 0.9, 3.2), ('oben', 0.25, 1.7, 2.6)]
SETUP = """(() => {
  document.getElementById('ui').style.display = 'none';
  window.__studio = (kind, look, flap, yaw, h, dist, t) => {
    const app = __app; if (kind) app.player.setCharacter(kind, look);
    const c = app.player.critter, sp = app.showPos; __game.freeze(true);
    c.root.position.copy(sp); c.root.rotation.set(0, 0, 0); c.tilt.rotation.set(0, 0, 0);
    c.flapT = flap; c.blinkT = 3; c.happyT = 0; c.update(0.001, t || 1, { speed01: 0.5 });
    c.body.scale.set(1, 1, 1); c.body.position.y = 0;
    app.player.shadow.position.set(sp.x, sp.y - 1.4, sp.z);
    const k = Math.max(1, c.size || 1), cam = app.camera;
    cam.position.set(sp.x + Math.sin(yaw) * dist * k, sp.y + h * k, sp.z + Math.cos(yaw) * dist * k);
    cam.fov = 40; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); cam.lookAt(sp.x, sp.y + 0.05 * k, sp.z);
    return __app.frames;
  };
})()"""

def open_studio(pw, quality=2):
    s = Session(pw, device=STUDIO)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Studio'); s.tap('[data-a=create]')
    s.ev(f"__game.setQuality({quality})"); time.sleep(0.5)
    s.ev(SETUP)
    return s

def wait_frames(s, n=3, timeout=15):
    f0 = s.ev("__app.frames"); t0 = time.time()
    while s.ev("__app.frames") < f0 + n and time.time() - t0 < timeout: time.sleep(0.05)

def grid(s, out, kind, look, flap=0.8, views=VIEWS, label=None):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tiles = []
    for i, (nm, yaw, h, d) in enumerate(views):
        s.ev(f"__studio({json.dumps(kind) if i == 0 else 'null'}, {json.dumps(look)}, {flap}, {yaw}, {h}, {d})")
        wait_frames(s, 3)
        p = f'/tmp/_studio_{i}.png'; s.pg.screenshot(path=p); tiles.append(Image.open(p).convert('RGB'))
    w, h = tiles[0].size
    img = Image.new('RGB', (w * 2, h * 2))
    for i, t in enumerate(tiles): img.paste(t, ((i % 2) * w, (i // 2) * h))
    img = img.resize((w * 2 * 3 // 4, h * 2 * 3 // 4))
    img.save(out)
    return out

def matrix(s, out, items, view=('vorn', 0.55, 0.45, 2.7), cols=3, flap=0.8, scale=0.5):
    """items: [(kind, look)] → Raster mit je einer Ansicht"""
    os.makedirs(os.path.dirname(out), exist_ok=True)
    nm, yaw, h, d = view
    tiles = []
    for i, (kind, look) in enumerate(items):
        s.ev(f"__studio({json.dumps(kind)}, {json.dumps(look)}, {flap}, {yaw}, {h}, {d})")
        wait_frames(s, 3)
        p = f'/tmp/_m_{i}.png'; s.pg.screenshot(path=p); tiles.append(Image.open(p).convert('RGB'))
    w, hh = tiles[0].size
    rows = (len(tiles) + cols - 1) // cols
    img = Image.new('RGB', (w * cols, hh * rows), (255, 255, 255))
    for i, t in enumerate(tiles): img.paste(t, ((i % cols) * w, (i // cols) * hh))
    img = img.resize((int(w * cols * scale), int(hh * rows * scale)))
    img.save(out)
    return out

CHARS = ['schmetterling', 'marienkaefer', 'biene', 'libelle', 'hummel', 'mondfalter', 'drache', 'einhorn', 'katze']
