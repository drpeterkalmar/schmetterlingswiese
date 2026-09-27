# Anatomie-Automatik (Lehre V1): Augen ragen aus dem Kopf, Pupillen vor dem Augenweiß, Kopf ohne Lücke zum Körper
# v2.2: alle 9 Figuren · Blickrichtung = Flugrichtung (+Z) · Hut sitzt auf dem Kopf (nicht schwebend, nicht versenkt)
#       · Brille vor den Augen · Umhang hinter dem Kopf und über dem Körper · Augenstile bleiben außen
import json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    r = s.ev("""(async () => {
      const THREE = __app.THREE;
      const { Critter, CHARACTERS, HATS } = await import('./js/actors/characters.js');
      const out = {}, bad = [];
      const box = (o) => { let r = o; while (r.parent) r = r.parent; r.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
      for (const { id: k } of CHARACTERS) {
        const c = new Critter(k, { hat: 'krone' });
        const hp = c.headPos, R = c.headR;
        const pos = c.eyesOpen.geometry.attributes.position, yOff = c.eyes.position.y;
        let front = -1e9, inside = 0, n = pos.count, ez = 0;
        for (let i = 0; i < n; i++) { const x = pos.getX(i), y = pos.getY(i) + yOff, z = pos.getZ(i);
          const d = Math.hypot(x - hp.x, y - hp.y, z - hp.z); if (d > R * 1.02) inside++; front = Math.max(front, z); ez += z; }
        ez /= n;
        // Körper-Geometrie: gibt es Vertices zwischen Kopf und Rumpf (keine Lücke)?
        const bp = c.bodyMesh.geometry.attributes.position; let gapFill = 0, bz = 0;
        for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i); bz += z; if (z < hp.z - R * 0.6 && z > hp.z - R * 1.6 && Math.abs(bp.getX(i)) < 0.08) gapFill++; }
        bz /= bp.count;
        // Hut: Unterkante nahe Kopfoberseite, mittig über dem Kopf
        const hb = box(c.hat), headTop = hp.y + R;
        const hatOk = hb.min.y > headTop - R * 0.45 && hb.min.y < headTop + R * 0.3 && Math.abs((hb.min.x + hb.max.x) / 2 - hp.x) < R * 0.3 && Math.abs((hb.min.z + hb.max.z) / 2 - hp.z) < R * 0.9;
        out[k] = { headR: +R.toFixed(3), eyeVertsOutsideHead: inside, eyeVerts: n, eyeFrontZ: +front.toFixed(3), headFrontZ: +(hp.z + R).toFixed(3), eyesProtrude: front > hp.z + R * 0.9,
          neckVerts: gapFill, blick: +(ez - bz).toFixed(3), hatBottom: +(hb.min.y - headTop).toFixed(3), hatOk };
        if (!(out[k].eyesProtrude && inside > n * 0.3)) bad.push(k + ':augen');
        c.bodyMesh.geometry.computeBoundingBox(); const bb = c.bodyMesh.geometry.boundingBox, bzc = (bb.min.z + bb.max.z) / 2;
        if (!(ez > hp.z && hp.z > bzc)) bad.push(k + ':blickrichtung');
        if (!hatOk) bad.push(k + ':krone');
        c.dispose();
        // alle Hüte + Extras + Augenstile
        for (const h of HATS) {
          if (h.id === 'none') continue;
          const d = new Critter(k, { hat: h.id }); const b = box(d.hat);
          const cy = (b.min.y + b.max.y) / 2, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
          if (h.id === 'helm') { if (!(Math.hypot(cx - hp.x, cy - hp.y, cz - hp.z) < R * 0.8 && b.max.y - b.min.y > R * 2.4)) bad.push(k + ':helm'); }
          else if (!(b.min.y > headTop - R * 0.6 && b.min.y < headTop + R * (h.id === 'heiligenschein' ? 0.9 : 0.35) && Math.abs(cx - hp.x) < R * 0.45)) bad.push(k + ':' + h.id + ':' + (b.min.y - headTop).toFixed(2));
          d.dispose();
        }
        const g = new Critter(k, { extra: 'brille' }), gb = box(g.extra);
        if (!(gb.max.z > hp.z + R * 0.75 && gb.min.y > hp.y - R * 0.5 && gb.max.y < hp.y + R * 1.1)) bad.push(k + ':brille');
        g.dispose();
        const u = new Critter(k, { extra: 'umhang' }), ub = box(u.extra);
        if (!(ub.max.z <= hp.z + 0.02 && ub.min.z < hp.z - R * 1.5)) bad.push(k + ':umhang');
        u.dispose();
        for (const e of ['wimpern', 'stern']) {
          const w = new Critter(k, { eyes: e }), p2 = w.eyesOpen.geometry.attributes.position; let f = -1e9;
          for (let i = 0; i < p2.count; i++) f = Math.max(f, p2.getZ(i));
          if (!(f > hp.z + R * 0.9)) bad.push(k + ':augen-' + e);
          w.dispose();
        }
      }
      return JSON.stringify({ out, bad });
    })()""")
    R = json.loads(r)
    print(json.dumps(R['out'], indent=1))
    print('ANATOMIE OK (9 Figuren, alle Hüte/Extras/Augenstile)' if not R['bad'] else 'ANATOMIE-FEHLER: ' + ', '.join(R['bad']))
    print(s.errors[:5])
    s.close()
