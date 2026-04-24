let lastSuccessLog = 0;
let lastRejectLog = 0;

window.__H_LOGS = window.__H_LOGS || [];
window.DEBUG_H = true;

export function computeHomography(matches, options = {}) {
  const result = computeHomographyDetailed(matches, options);
  return result ? result.H : null;
}

export function computeHomographyDetailed(matches, options = {}) {
  if (!window.cv) return null;
  if (!matches || matches.length < 4) return null;

  const cv = window.cv;

  const mode = options.mode || "auto";
  const isFlow =
    mode === "flow" ||
    (mode === "auto" && inferFlowLikeMatches(matches));

  const srcPoints = [];
  const dstPoints = [];
  const validMatches = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];

    if (
      !m ||
      !m.map ||
      !m.camera ||
      !Number.isFinite(m.map.x) ||
      !Number.isFinite(m.map.y) ||
      !Number.isFinite(m.camera.x) ||
      !Number.isFinite(m.camera.y)
    ) {
      continue;
    }

    srcPoints.push(m.map.x, m.map.y);
    dstPoints.push(m.camera.x, m.camera.y);
    validMatches.push(m);
  }

  const validCount = srcPoints.length / 2;
  if (validCount < 4) return null;

  const srcMat = cv.matFromArray(validCount, 1, cv.CV_32FC2, srcPoints);
  const dstMat = cv.matFromArray(validCount, 1, cv.CV_32FC2, dstPoints);
  const mask = new cv.Mat();

  let H = null;

  try {
    H = cv.findHomography(srcMat, dstMat, cv.RANSAC, 3, mask);

    if (!H || H.rows !== 3 || H.cols !== 3) {
      logReject("invalid matrix", validCount, 0);
      return null;
    }

    const h = [];
    for (let i = 0; i < 9; i++) {
      const value = H.data64F ? H.data64F[i] : H.data[i];
      if (!Number.isFinite(value)) {
        logReject("non-finite matrix", validCount, 0);
        return null;
      }
      h.push(value);
    }

    if (Math.abs(h[8]) < 1e-8) {
      logReject("degenerate h33", validCount, 0);
      return null;
    }

    let inliers = 0;
    const inlierMatches = [];

    for (let i = 0; i < mask.rows; i++) {
      if (mask.data[i] === 1) {
        inliers++;
        inlierMatches.push(validMatches[i]);
      }
    }

    const totalMatches = validCount;
    const ratio = inliers / totalMatches;

    const scaleX = Math.sqrt(h[0] * h[0] + h[3] * h[3]);
    const scaleY = Math.sqrt(h[1] * h[1] + h[4] * h[4]);
    const perspectiveX = Math.abs(h[6]);
    const perspectiveY = Math.abs(h[7]);
    const anisotropy = getAnisotropy(scaleX, scaleY);

    const thresholds = isFlow
  ? {
      minInliers: 6,
      minRatio: 0.25,
      minScale: 0.15,
      maxScale: 3.0,
      maxPerspective: 0.05,
      maxAnisotropy: 3.0
    }
  : {
      minInliers: 8,
      minRatio: 0.25,
      minScale: 0.15,
      maxScale: 3.0,
      maxPerspective: 0.03,
      maxAnisotropy: 2.5
    };

    if (inliers < thresholds.minInliers) {

  if (isFlow) {
    logFlowFail("low inliers", {
      matches: totalMatches,
      inliers,
      ratio,
      scaleX,
      scaleY,
      anisotropy,
      perspectiveX,
      perspectiveY
    });
  }

  logRejectDetailed("low inliers", {
    mode,
    matches: totalMatches,
    inliers,
    ratio,
    scaleX,
    scaleY,
    perspectiveX,
    perspectiveY,
    anisotropy,
    thresholds
  });

  return null;
}

    if (ratio < thresholds.minRatio) {

  if (isFlow) {
    logFlowFail("low ratio", {
      matches: totalMatches,
      inliers,
      ratio,
      scaleX,
      scaleY,
      anisotropy,
      perspectiveX,
      perspectiveY
    });
  }

  logRejectDetailed("low ratio", {
    mode,
    matches: totalMatches,
    inliers,
    ratio,
    scaleX,
    scaleY,
    perspectiveX,
    perspectiveY,
    anisotropy,
    thresholds
  });

  return null;
}

    if (!isFlow && !hasGoodSpread(inlierMatches, isFlow)) {
      logRejectDetailed("poor spatial spread", {
        mode,
        matches: totalMatches,
        inliers,
        ratio,
        scaleX,
        scaleY,
        perspectiveX,
        perspectiveY,
        anisotropy,
        thresholds
      });
      return null;
    }

    const minObservedScale = Math.min(scaleX, scaleY);
const maxObservedScale = Math.max(scaleX, scaleY);

if (
  maxObservedScale < thresholds.minScale ||
  (maxObservedScale > thresholds.maxScale && anisotropy < thresholds.maxAnisotropy)
) {
  console.warn("🚨 SCALE REJECT DETAILS");

  console.warn(
    `scaleX=${scaleX.toFixed(4)} scaleY=${scaleY.toFixed(4)}`
  );

  console.warn(
    `minObserved=${minObservedScale.toFixed(4)} maxObserved=${maxObservedScale.toFixed(4)}`
  );

  console.warn(
    `thresholds: min=${thresholds.minScale} max=${thresholds.maxScale}`
  );

  console.warn(
    `inliers=${inliers} ratio=${ratio.toFixed(3)}`
  );

  console.warn(
    `perspectiveX=${perspectiveX.toFixed(6)} perspectiveY=${perspectiveY.toFixed(6)}`
  );

  console.warn(
    `anisotropy=${anisotropy.toFixed(3)}`
  );

  console.warn(
    `spread check skipped? isFlow=${isFlow}`
  );

  if (isFlow) {
    logFlowFail("scale", {
      matches: totalMatches,
      inliers,
      ratio,
      scaleX,
      scaleY,
      anisotropy,
      perspectiveX,
      perspectiveY
    });
  }

  return null;
}
              

    if (
  perspectiveX > thresholds.maxPerspective ||
  perspectiveY > thresholds.maxPerspective
) {

  if (isFlow) {
    logFlowFail("perspective", {
      matches: totalMatches,
      inliers,
      ratio,
      scaleX,
      scaleY,
      anisotropy,
      perspectiveX,
      perspectiveY
    });
  }

  logRejectDetailed("high perspective", {
    mode,
    matches: totalMatches,
    inliers,
    ratio,
    scaleX,
    scaleY,
    perspectiveX,
    perspectiveY,
    anisotropy,
    thresholds
  });

  return null;
}

    if (anisotropy > thresholds.maxAnisotropy) {

  if (isFlow) {
    logFlowFail("anisotropy", {
      matches: totalMatches,
      inliers,
      ratio,
      scaleX,
      scaleY,
      anisotropy,
      perspectiveX,
      perspectiveY
    });
  }

  logRejectDetailed("anisotropic scale", {
    mode,
    matches: totalMatches,
    inliers,
    ratio,
    scaleX,
    scaleY,
    perspectiveX,
    perspectiveY,
    anisotropy,
    thresholds
  });

  return null;
}

    let score = 0;
    score += Math.min(inliers * 3, 40);
    score += Math.min(ratio * 40, 30);

    const scaleError = Math.abs(scaleX - 1) + Math.abs(scaleY - 1);
    score += Math.max(0, 20 - scaleError * 15);

    const perspectivePenalty = (perspectiveX + perspectiveY) * 300;
    score += Math.max(0, 10 - perspectivePenalty);

    score = Math.max(0, Math.min(100, Math.round(score)));

    const now = Date.now();
    if (window.DEBUG_H && now - lastSuccessLog > 700) {
      lastSuccessLog = now;

      console.log(
        `%cH SCORE: ${score}`,
        `color:${score > 70 ? "lime" : score > 40 ? "orange" : "red"}; font-weight:bold`
      );

      console.log(
        `mode=${mode} matches=${totalMatches} inliers=${inliers} ratio=${ratio.toFixed(2)} ` +
        `sx=${scaleX.toFixed(3)} sy=${scaleY.toFixed(3)} anis=${anisotropy.toFixed(2)} ` +
        `px=${perspectiveX.toFixed(5)} py=${perspectiveY.toFixed(5)}`
      );
    }

    return {
      H: h,
      inliers,
      ratio,
      score,
      scaleX,
      scaleY,
      perspectiveX,
      perspectiveY,
      anisotropy,
      inlierMatches
    };
  } finally {
    srcMat.delete();
    dstMat.delete();
    mask.delete();
    if (H) H.delete();
  }
}

function hasGoodSpread(matches, isFlow = false) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const m of matches) {
    const x = m.camera.x;
    const y = m.camera.y;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const spreadX = maxX - minX;
  const spreadY = maxY - minY;

  if (isFlow) {
    return spreadX > 25 && spreadY > 25;
  }

  return spreadX > 50 && spreadY > 50;
}

function inferFlowLikeMatches(matches) {
  if (!matches || matches.length === 0) return false;

  let countWithDist = 0;
  for (const m of matches) {
    if (m && typeof m.dist === "number") {
      countWithDist++;
    }
  }

  return countWithDist < Math.ceil(matches.length * 0.5);
}

function getAnisotropy(scaleX, scaleY) {
  const sx = Math.abs(scaleX);
  const sy = Math.abs(scaleY);

  if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < 1e-8 || sy < 1e-8) {
    return Infinity;
  }

  return sx > sy ? sx / sy : sy / sx;
}

function logReject(reason, matches, inliers = 0) {
  const now = Date.now();
  if (!window.DEBUG_H) return;

  if (now - lastRejectLog > 700) {
    lastRejectLog = now;
    console.warn(`❌ Reject H: ${reason} matches=${matches} inliers=${inliers}`);
  }
}

function logRejectDetailed(reason, d) {
  const now = Date.now();
  if (!window.DEBUG_H) return;

  if (now - lastRejectLog > 700) {
    lastRejectLog = now;

    console.warn(
      `❌ Reject H: ${reason} ` +
      `mode=${d.mode} matches=${d.matches} inliers=${d.inliers} ` +
      `ratio=${d.ratio.toFixed(2)} ` +
      `sx=${d.scaleX.toFixed(3)} sy=${d.scaleY.toFixed(3)} ` +
      `anis=${d.anisotropy.toFixed(2)} ` +
      `px=${d.perspectiveX.toFixed(5)} py=${d.perspectiveY.toFixed(5)}`
    );
  }
}

function logFlowFail(reason, d) {
  if (!window.DEBUG_H) return;

  const now = Date.now();
  if (now - lastRejectLog > 200) {
    lastRejectLog = now;

    console.warn(
  `🧠 FLOW FAIL | ${reason} | ` +
  `m=${d.matches} i=${d.inliers} r=${(d.ratio ?? 0).toFixed(2)} ` +
  `sx=${d.scaleX.toFixed(3)} sy=${d.scaleY.toFixed(3)} ` +
  `anis=${d.anisotropy.toFixed(2)} ` +
  `px=${d.perspectiveX.toFixed(5)} py=${d.perspectiveY.toFixed(5)}`
    );
  }
}