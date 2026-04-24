export function projectFeatureToScreen(feature, canvas, config = {}) {
  if (!feature || !canvas) return null;

  const { x, y } = feature;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const {
    homography = null
  } = config;

  // -----------------------------
  // 🟢 CASE 1: Use homography (CORRECTED)
  // -----------------------------
  if (homography && homography.length === 9) {
    const [
      h11, h12, h13,
      h21, h22, h23,
      h31, h32, h33
    ] = homography;

    const denom = h31 * x + h32 * y + h33;

    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-6) {
      return null;
    }

    const px = (h11 * x + h12 * y + h13) / denom;
    const py = (h21 * x + h22 * y + h23) / denom;

    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      return null;
    }

    // ✅ RETURN DIRECT PIXEL COORDS
    return {
      x: px,
      y: py
    };
  }

  // -----------------------------
  // 🟡 Fallback (only for no tracking)
  // -----------------------------
  return fallback(feature, canvas);
}

// -----------------------------
// Shared fallback
// -----------------------------
function fallback(feature, canvas) {
  return {
    x: feature.x,
    y: feature.y
  };
}

export function projectScreenToMap(x, y, H) {
  if (!Array.isArray(H) || H.length !== 9) return null;

  const det =
    H[0] * (H[4] * H[8] - H[5] * H[7]) -
    H[1] * (H[3] * H[8] - H[5] * H[6]) +
    H[2] * (H[3] * H[7] - H[4] * H[6]);

  if (!Number.isFinite(det) || Math.abs(det) < 1e-8) return null;

  const inv = [
    (H[4] * H[8] - H[5] * H[7]) / det,
    (H[2] * H[7] - H[1] * H[8]) / det,
    (H[1] * H[5] - H[2] * H[4]) / det,

    (H[5] * H[6] - H[3] * H[8]) / det,
    (H[0] * H[8] - H[2] * H[6]) / det,
    (H[2] * H[3] - H[0] * H[5]) / det,

    (H[3] * H[7] - H[4] * H[6]) / det,
    (H[1] * H[6] - H[0] * H[7]) / det,
    (H[0] * H[4] - H[1] * H[3]) / det
  ];

  const px = inv[0] * x + inv[1] * y + inv[2];
  const py = inv[3] * x + inv[4] * y + inv[5];
  const pz = inv[6] * x + inv[7] * y + inv[8];

  if (!Number.isFinite(pz) || Math.abs(pz) < 1e-8) return null;

  return {
    x: px / pz,
    y: py / pz
  };
}