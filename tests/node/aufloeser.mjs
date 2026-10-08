// Modul-Auflöser für die Node-Tests: der nackte Name 'three' zeigt wie im Browser (Importmap) auf lib/.
const THREE_URL = new URL('../../lib/three.module.min.js', import.meta.url).href;
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: THREE_URL, shortCircuit: true, format: 'module' };
  return next(spec, ctx);
}
