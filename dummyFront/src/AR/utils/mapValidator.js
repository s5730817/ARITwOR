// -----------------------------
// Validate stored map (IndexedDB)
// -----------------------------
export function validateStoredMap(map) {
  if (!map) return "Map is null";

  if (!map.id) return "Missing map id";

  // raw map path
  const fm = map.featureMap || map;

  if (!fm.keyframes || Object.keys(fm.keyframes).length === 0) {
    return "No keyframes found";
  }

  const firstKF = Object.values(fm.keyframes)[0];

  if (!firstKF) return "Invalid keyframe structure";

  if (!firstKF.descriptorIds || firstKF.descriptorIds.length === 0) {
    return "No descriptorIds in keyframe";
  }

  return null; // ✅ valid
}