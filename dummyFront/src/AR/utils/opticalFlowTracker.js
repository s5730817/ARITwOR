import { extractCameraFeatures } from "./cameraFeatures";

// tunables
const MAX_POINTS = 80;
const MIN_POINTS = 12;
const maxErr = 45;
const maxMotion = 150;

let trackingState = {
  active: false,
  prevGray: null,
  cameraPoints: [],
  mapPoints: [],
  synthetic: [],
  weakFrames: 0,
  age: 0
};

// -----------------------------
// Reset
// -----------------------------
export function resetOpticalFlowState() {
  if (trackingState.prevGray) {
    trackingState.prevGray.delete();
  }

  trackingState = {
    active: false,
    prevGray: null,
    cameraPoints: [],
    mapPoints: [],
    synthetic: [],
    weakFrames: 0,
    age: 0
  };
}

// -----------------------------
// Active check
// -----------------------------
export function hasActiveTracking() {
  return (
    trackingState.active &&
    trackingState.prevGray &&
    trackingState.cameraPoints.length >= MIN_POINTS &&
    trackingState.mapPoints.length === trackingState.cameraPoints.length
  );
}

// -----------------------------
// Spread inlier selection
// -----------------------------
function selectSpreadInliers(inliers, width, height, maxPoints) {
  const gridCols = 4;
  const gridRows = 4;
  const buckets = Array.from({ length: gridCols * gridRows }, () => []);

  for (const m of inliers) {
    const p = m.cam || m.camera;
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

    const col = Math.min(
      gridCols - 1,
      Math.max(0, Math.floor((p.x / width) * gridCols))
    );

    const row = Math.min(
      gridRows - 1,
      Math.max(0, Math.floor((p.y / height) * gridRows))
    );

    buckets[row * gridCols + col].push(m);
  }

  const selected = [];

  while (selected.length < maxPoints) {
    let added = false;

    for (const bucket of buckets) {
      if (bucket.length && selected.length < maxPoints) {
        selected.push(bucket.shift());
        added = true;
      }
    }

    if (!added) break;
  }

  return selected;
}

// -----------------------------
// Init from inliers
// -----------------------------
export function initializeTrackingFromInliers(frame, inlierMatches) {
  const cv = window.cv;
  if (!cv) return false;
  if (!frame || !inlierMatches || inlierMatches.length < MIN_POINTS) return false;

  const gray = toGrayMat(frame);
  if (!gray) return false;

  const selected = selectSpreadInliers(
    inlierMatches,
    gray.cols,
    gray.rows,
    MAX_POINTS
  );

  if (selected.length < MIN_POINTS) {
    gray.delete();
    return false;
  }

  if (trackingState.prevGray) {
    trackingState.prevGray.delete();
  }

  trackingState.prevGray = gray;

  trackingState.cameraPoints = selected
    .map(m => ({
      x: m.cam?.x ?? m.camera?.x,
      y: m.cam?.y ?? m.camera?.y
    }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  trackingState.mapPoints = selected
    .map(m => ({
      x: m.map?.x,
      y: m.map?.y
    }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  const count = Math.min(
    trackingState.cameraPoints.length,
    trackingState.mapPoints.length,
    MAX_POINTS
  );

  trackingState.cameraPoints = trackingState.cameraPoints.slice(0, count);
  trackingState.mapPoints = trackingState.mapPoints.slice(0, count);
  trackingState.synthetic = Array(count).fill(false);

  if (count < MIN_POINTS) {
    resetOpticalFlowState();
    return false;
  }

  trackingState.active = true;
  trackingState.weakFrames = 0;
  trackingState.age = 0;

  return true;
}

// -----------------------------
// Optical Flow Tracking
// -----------------------------
export function trackPointsWithOpticalFlow(frame) {
  const cv = window.cv;

  if (!cv || !hasActiveTracking() || !frame) {
    return {
      ok: false,
      weak: true,
      confidence: 0,
      reason: "tracking inactive",
      trackedMatches: []
    };
  }

  const nextGray = toGrayMat(frame);
  if (!nextGray) {
    return {
      ok: false,
      weak: true,
      confidence: 0,
      reason: "failed to build gray frame",
      trackedMatches: []
    };
  }

  const prevPtsArray = [];
  for (const p of trackingState.cameraPoints) {
    prevPtsArray.push(p.x, p.y);
  }

  const prevPts = cv.matFromArray(
    trackingState.cameraPoints.length,
    1,
    cv.CV_32FC2,
    prevPtsArray
  );

  const nextPts = new cv.Mat();
  const status = new cv.Mat();
  const err = new cv.Mat();

  cv.calcOpticalFlowPyrLK(
    trackingState.prevGray,
    nextGray,
    prevPts,
    nextPts,
    status,
    err,
    new cv.Size(21, 21),
    3,
    new cv.TermCriteria(
      cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT,
      30,
      0.01
    )
  );

  const trackedMatches = [];

  for (let i = 0; i < trackingState.cameraPoints.length; i++) {
    if (status.data[i] !== 1) continue;

    const prev = trackingState.cameraPoints[i];

    const x = nextPts.data32F[i * 2];
    const y = nextPts.data32F[i * 2 + 1];
    const e = err.data32F ? err.data32F[i] : 0;

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || y < 0 || x >= nextGray.cols || y >= nextGray.rows) continue;
    if (Number.isFinite(e) && e > maxErr) continue;

    const dx = x - prev.x;
    const dy = y - prev.y;

    if (dx * dx + dy * dy > maxMotion * maxMotion) continue;

    trackedMatches.push({
      map: trackingState.mapPoints[i],
      camera: { x, y },
      synthetic: false
    });
  }

  prevPts.delete();
  nextPts.delete();
  status.delete();
  err.delete();

  if (trackingState.prevGray) {
    trackingState.prevGray.delete();
  }

  trackingState.prevGray = nextGray;

  // -----------------------------
  // Update state only with real tracked correspondences
  // -----------------------------
  if (trackedMatches.length >= MIN_POINTS) {
    trackingState.cameraPoints = trackedMatches.map(m => m.camera);
    trackingState.mapPoints = trackedMatches.map(m => m.map);
    trackingState.synthetic = trackedMatches.map(() => false);
    trackingState.weakFrames = 0;
  } else if (trackedMatches.length >= 6) {
    // Still return usable matches, but mark tracker as weak.
    trackingState.cameraPoints = trackedMatches.map(m => m.camera);
    trackingState.mapPoints = trackedMatches.map(m => m.map);
    trackingState.synthetic = trackedMatches.map(() => false);
    trackingState.weakFrames += 1;
  } else {
    trackingState.weakFrames += 1;
  }

  trackingState.age += 1;

  const realMatches = trackedMatches;

  return {
    ok: realMatches.length >= 6,
    weak: realMatches.length < MIN_POINTS,
    confidence: realMatches.length,
    reason:
      realMatches.length < 6
        ? "very low tracked points"
        : realMatches.length < MIN_POINTS
        ? "weak tracking"
        : null,
    trackedMatches: realMatches
  };
}

// -----------------------------
export function refreshTrackingFromInliers(frame, inlierMatches) {
  return initializeTrackingFromInliers(frame, inlierMatches);
}

// -----------------------------
function toGrayMat(frame) {
  const cv = window.cv;
  if (!cv || !frame) return null;

  let mat;

  try {
    mat = cv.matFromImageData(frame);
  } catch {
    return null;
  }

  if (!mat || mat.rows === 0 || mat.cols === 0) {
    return null;
  }

  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

  mat.delete();
  return gray;
}