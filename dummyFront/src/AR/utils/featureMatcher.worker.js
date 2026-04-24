// ✅ Load OpenCV FIRST
importScripts("https://docs.opencv.org/4.x/opencv.js");

// ✅ Then load feature extractor
importScripts("/cameraFeatures.worker.js");

// -----------------------------
// OpenCV ready flag
// -----------------------------
let cvReady = false;

if (typeof cv !== "undefined") {
  cv.onRuntimeInitialized = () => {
    cvReady = true;
    console.log("✅ OpenCV ready in worker");
  };
}

// -----------------------------
// Bit count lookup
// -----------------------------
const BIT_COUNT = new Uint8Array(256);
for (let i = 1; i < 256; i++) {
  BIT_COUNT[i] = BIT_COUNT[i >> 1] + (i & 1);
}

// -----------------------------
// Descriptor distance
// -----------------------------
function descriptorDistance(d1, d2) {
  let dist = 0;
  for (let i = 0; i < 32; i++) {
    dist += BIT_COUNT[d1[i] ^ d2[i]];
  }
  return dist;
}

// -----------------------------
// Descriptor extraction
// -----------------------------
function getDescriptor(f) {
  if (!f) return null;

  if (f.descriptor instanceof Uint8Array && f.descriptor.length === 32) {
    return f.descriptor;
  }

  if (Array.isArray(f.descriptor) && f.descriptor.length === 32) {
    return new Uint8Array(f.descriptor);
  }

  if (Array.isArray(f.vector) && f.vector.length === 32) {
    return new Uint8Array(f.vector);
  }

  return null;
}

// -----------------------------
// Matching
// -----------------------------
function matchFeaturesBatch(cameraFeatures, mapFeatures) {
  const stats = {
    camInput: cameraFeatures?.length || 0,
    mapInput: mapFeatures?.length || 0,
    camPrepared: 0,
    mapPrepared: 0,
    camBadDesc: 0,
    mapBadDesc: 0,
    noBest: 0,
    noSecond: 0,
    distRejected: 0,
    ratioRejected: 0,
    duplicateRejected: 0,
    accepted: 0,
    bestDistMin: Infinity,
    bestDistMax: -Infinity,
    bestDistSum: 0,
    ratioMin: Infinity,
    ratioMax: -Infinity,
    ratioSum: 0,
    ratioCount: 0,
  };

  if (!cameraFeatures?.length || !mapFeatures?.length) {
    console.log("MATCH STATS:", stats);
    return [];
  }

  const MAX_CAMERA = 320;
  const MAX_MAP = 650;

  const MAX_HAMMING_DIST = 140;
  const RATIO = 0.85;

  const camList = cameraFeatures.slice(0, MAX_CAMERA);
  const mapList = mapFeatures.slice(0, MAX_MAP);

  const preparedCam = [];
  for (const f of camList) {
    const desc = getDescriptor(f);
    if (!f || !desc) {
      stats.camBadDesc++;
      continue;
    }
    preparedCam.push({ feature: f, desc });
  }
  stats.camPrepared = preparedCam.length;

  const preparedMap = [];
  for (const f of mapList) {
    const desc = getDescriptor(f);
    if (!f || !desc) {
      stats.mapBadDesc++;
      continue;
    }
    preparedMap.push({ feature: f, desc });
  }
  stats.mapPrepared = preparedMap.length;

  if (!preparedCam.length || !preparedMap.length) {
    console.log("MATCH STATS:", stats);
    return [];
  }

  const matches = [];
  const usedMap = new Set();

  for (let c = 0; c < preparedCam.length; c++) {
    const cam = preparedCam[c];
    let best = null;
    let second = null;

    for (let i = 0; i < preparedMap.length; i++) {
      const mf = preparedMap[i];
      const dist = descriptorDistance(cam.desc, mf.desc);

      if (!best || dist < best.dist) {
        second = best;
        best = { mf, dist, idx: i };
      } else if (!second || dist < second.dist) {
        second = { mf, dist, idx: i };
      }
    }

    if (!best) {
      stats.noBest++;
      continue;
    }

    stats.bestDistMin = Math.min(stats.bestDistMin, best.dist);
    stats.bestDistMax = Math.max(stats.bestDistMax, best.dist);
    stats.bestDistSum += best.dist;

    if (!second) {
      stats.noSecond++;
      continue;
    }

    const ratio = best.dist / second.dist;
    stats.ratioMin = Math.min(stats.ratioMin, ratio);
    stats.ratioMax = Math.max(stats.ratioMax, ratio);
    stats.ratioSum += ratio;
    stats.ratioCount++;

    if (best.dist > MAX_HAMMING_DIST) {
      stats.distRejected++;
      continue;
    }

    if (best.dist >= second.dist * RATIO) {
      stats.ratioRejected++;
      continue;
    }

    if (usedMap.has(best.idx)) {
      stats.duplicateRejected++;
      continue;
    }

    usedMap.add(best.idx);

    matches.push({
      camera: { x: cam.feature.x, y: cam.feature.y },
      map: { x: best.mf.feature.x, y: best.mf.feature.y },
      dist: best.dist
    });

    stats.accepted++;
  }

  const bestDistAvg =
    preparedCam.length > 0 ? stats.bestDistSum / preparedCam.length : null;

  const ratioAvg =
    stats.ratioCount > 0 ? stats.ratioSum / stats.ratioCount : null;

  console.log("MATCH STATS:", {
    ...stats,
    bestDistMin: Number.isFinite(stats.bestDistMin) ? stats.bestDistMin : null,
    bestDistMax: Number.isFinite(stats.bestDistMax) ? stats.bestDistMax : null,
    bestDistAvg,
    ratioMin: Number.isFinite(stats.ratioMin) ? stats.ratioMin : null,
    ratioMax: Number.isFinite(stats.ratioMax) ? stats.ratioMax : null,
    ratioAvg,
    finalMatches: matches.length,
  });

  if (matches.length === 0) {
    console.log("ZERO MATCH FRAME:", {
      camPrepared: stats.camPrepared,
      mapPrepared: stats.mapPrepared,
      distRejected: stats.distRejected,
      ratioRejected: stats.ratioRejected,
      duplicateRejected: stats.duplicateRejected,
      bestDistAvg,
      ratioAvg,
    });
  }

  return matches;
}

// -----------------------------
// Main worker handler
// -----------------------------
self.onmessage = (e) => {
  const { jobId, imageData, mapFeatureSets } = e.data;

  console.log("WORKER START:", {
    jobId,
    cvReady,
    imageW: imageData?.width,
    imageH: imageData?.height,
    mapSets: mapFeatureSets?.length || 0,
  });

  if (!cvReady) {
    console.warn("⏳ OpenCV not ready");
    self.postMessage({ jobId, matches: [] });
    return;
  }

  let frame;
  try {
    frame = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  } catch (err) {
    console.error("❌ ImageData rebuild failed", err);
    self.postMessage({ jobId, matches: [] });
    return;
  }

  const cameraFeatures = self.extractCameraFeatures(frame);

  if (!cameraFeatures?.length) {
    console.log("❌ No camera features");
    self.postMessage({ jobId, matches: [] });
    return;
  }

  console.log("WORKER FEATURES:", {
    jobId,
    cameraFeatures: cameraFeatures.length,
  });

  let bestMatches = [];
  let bestCount = -1;

  for (let s = 0; s < mapFeatureSets.length; s++) {
    const mapFeatures = mapFeatureSets[s];
    console.log("MATCH SET START:", {
      jobId,
      setIndex: s,
      mapFeatures: mapFeatures?.length || 0,
    });

    const matches = matchFeaturesBatch(cameraFeatures, mapFeatures);

    console.log("MATCH SET RESULT:", {
      jobId,
      setIndex: s,
      count: matches.length,
    });

    if (matches.length > bestCount) {
      bestMatches = matches;
      bestCount = matches.length;
    }

    if (bestCount > 25) break;
  }

  console.log("WORKER MATCHES:", {
    jobId,
    bestCount: bestMatches.length,
  });

  self.postMessage({
    jobId,
    matches: bestMatches
  });
};