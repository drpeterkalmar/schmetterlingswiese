// Grafik-Kern (v2.9, aus stuntbahn/src/gfx/kinolook.js `kinoSR`, eigener Code): kantenbewusstes Hochskalieren aus der
// Renderskala – bilinear, an Kanten entlang der Kante geglättet (FXAA-Art: 4 Diagonalen + 4 Richtungs-Abtastungen),
// sonst kontrastabhängig nachgeschärft (CAS-Art, Halos auf die Nachbarschaft begrenzt).
// Anders als im Kino-Look ist die Quelle hier ein LINEARES HDR-Bild (Halbfloat, Werte > 1): AA und Schärfen laufen
// deshalb auf einer gestauchten Kopie (Reinhard x/(1+x), wahrnehmungsnah, 0…1) und werden danach zurückgerechnet.
//
// Anschluss im Endbild-Shader:  `${KANTEN_SR}` vor main(), dann  vec3 c = kantenSR(tCol, vUv);
//   uniforms: uSrcTexel (1 / Größe der Quelle), uSharp (0…1, Startwert Mittel 0,4, Hoch 0,25)
//   defines:  AA (Kantenglättung, Stufen ohne MSAA), SHARP (Nachschärfen); ohne beide = reines bilineares Lesen.
export const KANTEN_SR = /* glsl */`
uniform vec2 uSrcTexel; uniform float uSharp;
vec3 srK(vec3 c){ return c / (1.0 + c); }
vec3 srE(vec3 c){ c = min(c, vec3(0.999)); return c / (1.0 - c); }
float srL(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 kantenSR(sampler2D tex, vec2 uv){
  vec3 c = texture2D(tex, uv).rgb;
#if defined(AA) || defined(SHARP)
  vec2 t = uSrcTexel;
  c = srK(c);
  vec3 nw = srK(texture2D(tex, uv + vec2(-t.x, t.y) * 0.5).rgb), ne = srK(texture2D(tex, uv + vec2(t.x, t.y) * 0.5).rgb);
  vec3 sw = srK(texture2D(tex, uv + vec2(-t.x, -t.y) * 0.5).rgb), se = srK(texture2D(tex, uv + vec2(t.x, -t.y) * 0.5).rgb);
  float lnw = srL(nw), lne = srL(ne), lsw = srL(sw), lse = srL(se), lc = srL(c);
  float lmin = min(lc, min(min(lnw, lne), min(lsw, lse))), lmax = max(lc, max(max(lnw, lne), max(lsw, lse)));
  float range = lmax - lmin;
 #ifdef AA
  if (range > max(0.04, lmax * 0.1)) {
    vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));
    float red = max((lnw + lne + lsw + lse) * 0.03125, 0.0078125);
    dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -6.0, 6.0) * t;
    vec3 a = 0.5 * (srK(texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb) + srK(texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb));
    vec3 b = a * 0.5 + 0.25 * (srK(texture2D(tex, uv - dir * 0.5).rgb) + srK(texture2D(tex, uv + dir * 0.5).rgb));
    float lb = srL(b);
    return srE((lb < lmin || lb > lmax) ? a : b);
  }
 #endif
 #ifdef SHARP
  vec3 mn = min(c, min(min(nw, ne), min(sw, se))), mx = max(c, max(max(nw, ne), max(sw, se)));
  vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-3), 0.0, 1.0)); // CAS: wenig Spielraum → wenig schärfen
  vec3 avg = (nw + ne + sw + se) * 0.25;
  c = clamp(c + (c - avg) * amp * uSharp * 2.0, mn, mx);
 #endif
  c = srE(c);
#endif
  return c;
}`;

// Größe des Render-Targets aus Zeichenpuffer und Renderskala (gerundet, mind. 1 Pixel) – rein, für Tests
export function rtGroesse(w, h, skala) {
  const s = Math.max(0.1, Math.min(1, +skala || 1));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
}
