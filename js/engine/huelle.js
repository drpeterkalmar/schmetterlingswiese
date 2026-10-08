// v2.9 frustumCulled wieder an (Audit #7): Objectives, Honig-Sonnenblumen, Fangringe, NPC-Gruppen, Tiere, Wespen.
// three.js prüft bei InstancedMesh eine Hüllkugel über ALLE Instanzen; bewegen sich die Instanzen, muss sie nach jedem
// Matrix-Update neu gerechnet werden (≤ 100 Instanzen → Bruchteile einer Millisekunde). Rand für alles, was der
// Vertex-Shader zusätzlich verschiebt: Weltkrümmung (bendW, bis ≈ 3 m bei 60 m), Flügelschlag, Wiegen, Glüh-Pulsieren.
// Merke: Gruppen, die über die ganze Wiese verteilt sind, werden nur weggelassen, wenn ALLE Instanzen außer Sicht sind.
// ?cull=0 = wie bis v2.8 (immer zeichnen).
export const CULL_AN = new URLSearchParams(location.search).get('cull') !== '0';
export const HUELLE_RAND = 3;

export function huelle(im, rand = HUELLE_RAND) {
  if (!CULL_AN || !im) return;
  im.frustumCulled = true;
  im.computeBoundingSphere();
  if (im.boundingSphere) im.boundingSphere.radius = Math.max(0, im.boundingSphere.radius) + rand;
}
