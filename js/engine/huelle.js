// v2.9 frustumCulled wieder an (Audit #7): Objectives, Honig-Sonnenblumen, Fangringe, NPC-Gruppen, Tiere, Wespen.
// three.js prüft bei InstancedMesh eine Hüllkugel über ALLE Instanzen; bewegen sich die Instanzen, muss sie nach jedem
// Matrix-Update neu gerechnet werden (≤ 100 Instanzen → Bruchteile einer Millisekunde). Rand für alles, was der
// Vertex-Shader zusätzlich verschiebt: Weltkrümmung (bendW, bis ≈ 3 m bei 60 m), Flügelschlag, Wiegen, Glüh-Pulsieren.
// Merke: Gruppen, die über die ganze Wiese verteilt sind, werden nur weggelassen, wenn ALLE Instanzen außer Sicht sind.
// ?cull=0 = wie bis v2.8 (immer zeichnen).
export const CULL_AN = new URLSearchParams(location.search).get('cull') !== '0';
export const HUELLE_RAND = 3;

// Neu gerechnet höchstens alle 50 ms (sofort, wenn sich die Instanzzahl ändert): in 50 ms bewegen sich Falter, Tiere und
// Wespen < 0,5 m – der Rand deckt das ab. Jedes Bild kostete das ≈ 0,07 ms bei CPU ×4 (Heavy-Job-Messung).
export const HUELLE_TAKT_MS = 50;
export function huelle(im, rand = HUELLE_RAND, jetzt = performance.now()) {
  if (!CULL_AN || !im) return;
  im.frustumCulled = true;
  const u = im.userData;
  if (im.boundingSphere && u.huelleN === im.count && jetzt - u.huelleT < HUELLE_TAKT_MS) return;
  u.huelleN = im.count; u.huelleT = jetzt;
  im.computeBoundingSphere();
  if (im.boundingSphere) im.boundingSphere.radius = Math.max(0, im.boundingSphere.radius) + rand;
}
