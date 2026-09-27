# v2.2: alle Flügelformen/Muster/Skins als 2D-Raster (Sichtprüfung der Umrisse)
import sys, base64
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    url = s.ev("""(async () => {
      const T = await import('./js/engine/textures.js');
      const shapes = T.WING_SHAPES, skins = ['regenbogen', 'melone', 'galaxie', 'disco', 'leucht'];
      const glass = ['bee', 'round', 'tip', 'long', 'longtip'];
      const W = 150, cols = Math.max(shapes.length, skins.length + 1, 7);
      const c = document.createElement('canvas'); c.width = cols * W; c.height = W * 5; const x = c.getContext('2d');
      x.fillStyle = '#9fc9a0'; x.fillRect(0, 0, c.width, c.height);
      const put = (img, i, row) => x.drawImage(img, i * W + 5, row * W + 5, W - 10, W - 10);
      shapes.forEach((sh, i) => put(T.tintMask(T.wingMask(sh === 'drache' ? 'membran' : sh === 'feder' ? 'feder' : 'monarch', sh), 0xff9636, 0xffd36b, 0x3a2418).image, i, 0));
      ['monarch', 'verlauf', 'punkte', 'herzen', 'streifen', 'sterne', 'augen'].forEach((p, i) => put(T.tintMask(T.wingMask(p, i < 4 ? 'luna' : 'spitz'), 0xa8f0c8, 0xe8fff4, 0x9a5a8a).image, i, 1));
      skins.forEach((k, i) => put(T.skinWing(k, ['rund', 'spitz', 'lang', 'luna', 'drache'][i]).image, i, 2));
      skins.forEach((k, i) => put(T.skinWing(k, 'feder').image, i, 3));
      glass.forEach((g, i) => put(T.glassWing(g, i % 2 ? 'regenbogen' : null).image, i, 4));
      return c.toDataURL();
    })()""")
    open('tests/shots/v22/tex_raster.png', 'wb').write(base64.b64decode(url.split(',')[1]))
    print('errors', s.errors)
    s.close()
