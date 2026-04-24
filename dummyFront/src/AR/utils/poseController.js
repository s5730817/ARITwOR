let displayH = null;
let lastStableH = null;
let lastUpdateTime = 0;

const HOLD_TIME_MS = 80;
const ALPHA_STRONG = 0.8;


const MIN_DELTA = 0.002;

function hasMeaningfulChange(H1, H2) {
  if (!H1 || !H2) return true;

  let totalDiff = 0;
  for (let i = 0; i < 9; i++) {
    totalDiff += Math.abs(H1[i] - H2[i]);
  }

  return totalDiff > MIN_DELTA;
}

// -----------------------------
// UPDATE
// -----------------------------
export function updatePose(trackingResult) {
  const now = Date.now();

  if (!lastUpdateTime) {
    lastUpdateTime = now;
  }

  const H = trackingResult?.H;
  const hasPose = Array.isArray(H);

  console.log("POSE TRANSITION", {
    prev: !!displayH,
    next: !!H
  });

  console.log(
    `POSE INPUT | ${hasPose ? "VALID" : "NULL"} | fresh=${trackingResult?.isFresh}`
  );

  // -----------------------------
  // 1. Strong update
  // -----------------------------
  if (hasPose) {
    if (
      displayH &&
      !trackingResult?.isFresh &&
      !hasMeaningfulChange(displayH, H)
    ) {
      console.log("🟡 POSE IGNORE (tiny stale delta)");
      lastUpdateTime = now;
      return;
    }

    lastUpdateTime = now;

    if (!displayH) {
      displayH = [...H];
      lastStableH = [...H];

      console.log("POSE INIT");
      console.log("DISPLAY STATE | SET");
      return;
    }

    // -----------------------------
    // 🔥 NEW: motion-based smoothing
    // -----------------------------
    let motion = 0;

    if (displayH) {
      const dx = H[2] - displayH[2];
      const dy = H[5] - displayH[5];
      motion = Math.sqrt(dx * dx + dy * dy);
    }

    let alpha;

    if (trackingResult.isFresh) {
      alpha = ALPHA_STRONG; // matcher (~0.6)
    } else {
      if (trackingResult.isFresh) {
        alpha = 0.85;
      } else {
        if (motion > 5) alpha = 0.9;
        else if (motion > 1) alpha = 0.75;
        else alpha = 0.55;
      }
    }

    // -----------------------------
    // Apply smoothing
    // -----------------------------
    for (let i = 0; i < 9; i++) {
      displayH[i] =
        displayH[i] * (1 - alpha) +
        H[i] * alpha;
    }

    lastStableH = [...displayH];

    console.log(`POSE UPDATE | alpha=${alpha.toFixed(2)} motion=${motion.toFixed(2)}`);
    console.log("DISPLAY STATE | SET");
    return;
  }

  // -----------------------------
  // 2. Hold
  // -----------------------------
  const timeSinceUpdate = now - lastUpdateTime;

  if (lastStableH && timeSinceUpdate < HOLD_TIME_MS) {
    if (!displayH) {
      displayH = [...lastStableH];
    }

    console.log(`POSE HOLD | ${timeSinceUpdate}ms`);
    console.log("DISPLAY STATE | SET");
    return;
  }

  // -----------------------------
  // 3. Lost
  // -----------------------------
  console.log(`POSE LOST | ${timeSinceUpdate}ms`);
  displayH = null;
  console.log("DISPLAY STATE | NULL");
}

// -----------------------------
// GET
// -----------------------------
export function getDisplayPose() {
  return displayH;
}

// -----------------------------
// RESET
// -----------------------------
export function resetPose() {
  displayH = null;
  lastStableH = null;
  lastUpdateTime = 0;
}