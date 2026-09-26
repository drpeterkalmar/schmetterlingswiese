# Anatomie-Automatik (Lehre V1): Augen ragen aus dem Kopf, Pupillen vor dem Augenweiß, Kopf ohne Lücke zum Körper
import json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    r = s.ev("""(async () => {
      const { Critter } = await import('./js/actors/characters.js');
      const out = {};
      for (const k of ['schmetterling', 'marienkaefer', 'biene', 'libelle']) {
        const c = new Critter(k, { color: 0, pattern: 'monarch', hat: 'krone' });
        const hp = c.headPos, R = c.headR;
        const pos = c.eyesOpen.geometry.attributes.position, yOff = c.eyes.position.y;
        let front = -1e9, inside = 0, n = pos.count;
        for (let i = 0; i < n; i++) { const x = pos.getX(i), y = pos.getY(i) + yOff, z = pos.getZ(i);
          const d = Math.hypot(x - hp.x, y - hp.y, z - hp.z); if (d > R * 1.02) inside++; front = Math.max(front, z); }
        // Körper-Geometrie: gibt es Vertices zwischen Kopf und Rumpf (keine Lücke)?
        const bp = c.bodyMesh.geometry.attributes.position; let gapFill = 0;
        for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i); if (z < hp.z - R * 0.6 && z > hp.z - R * 1.6 && Math.abs(bp.getX(i)) < 0.08) gapFill++; }
        out[k] = { headR: +R.toFixed(3), eyeVertsOutsideHead: inside, eyeVerts: n, eyeFrontZ: +front.toFixed(3), headFrontZ: +(hp.z + R).toFixed(3), eyesProtrude: front > hp.z + R, neckVerts: gapFill, hat: !!c.hat };
        c.dispose();
      }
      return JSON.stringify(out);
    })()""")
    print(json.dumps(json.loads(r), indent=1))
    print(s.errors[:5])
    s.close()
