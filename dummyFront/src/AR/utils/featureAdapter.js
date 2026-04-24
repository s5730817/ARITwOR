export function extractFeatures(map) {
  if (!map || !map.descriptors) return [];

  return Object.entries(map.descriptors).map(([key, d]) => ({
    id: key,
    x: d.x,
    y: d.y,

    // ✅ REAL FIX
    descriptor: new Uint8Array(d.vector)
  }));
}