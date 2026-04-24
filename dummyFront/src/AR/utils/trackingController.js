import { computeHomographyDetailed } from "./geometry";
import {
  resetOpticalFlowState,
  hasActiveTracking,
  trackPointsWithOpticalFlow,
  initializeTrackingFromInliers,
} from "./opticalFlowTracker";

// -----------------------------
// Worker state
// -----------------------------
let matcherWorker = new Worker(
  new URL("./featureMatcher.worker.js", import.meta.url)
);

let workerBusy = false;
let currentJobId = 0;

// Stable match storage
let latestMatches = null;
let latestMatchScore = 0;
let latestMatchTime = 0;

// Tunables
const MIN_GOOD_MATCHES = 8;
const MAX_MATCH_AGE = 300;
const MIN_MATCHES_FOR_H = 6;
const MAX_AVG_MATCH_DIST = 70;
const MAX_BAD_FRAMES = 3;
const REMATCH_INTERVAL_MS = 120;
const FLOW_WEAK_THRESHOLD = 8;

// Pose persistence
const MAX_POSE_HOLD_MS = 400;
const STARTUP_GRACE_MS = 900;

// -----------------------------
// Worker response
// -----------------------------
matcherWorker.onmessage = (e) => {
  workerBusy = false;

  const { jobId, matches } = e.data;
  if (jobId !== currentJobId) return;

  const count = matches ? matches.length : 0;

  console.log("WORKER MATCHES:", count);
  console.log("WORKER RAW:", {
    count: matches?.length,
    sample: matches?.[0],
  });

  if (count < MIN_MATCHES_FOR_H) return;

  latestMatches = matches;
  latestMatchScore = count;
  latestMatchTime = Date.now();
};

// -----------------------------
// Persistent state
// -----------------------------
let badFrameCount = 0;
let lastRematchTime = 0;

let lastGoodH = null;
let lastGoodPoseTime = 0;
let trackingStartTime = 0;

// -----------------------------
// Reset state
// -----------------------------
export function resetTrackingState() {
  badFrameCount = 0;
  lastRematchTime = 0;

  latestMatches = null;
  latestMatchScore = 0;
  latestMatchTime = 0;

  lastGoodH = null;
  lastGoodPoseTime = 0;
  trackingStartTime = 0;

  workerBusy = false;
  resetOpticalFlowState();
}

// -----------------------------
// Pose helpers
// -----------------------------
function storeGoodPose(H, now) {
  lastGoodH = H;
  lastGoodPoseTime = now;
}

function getHeldPose(now) {
  if (!lastGoodH) return null;
  if (now - lastGoodPoseTime > MAX_POSE_HOLD_MS) return null;
  return lastGoodH;
}

// -----------------------------
// Fallback
// -----------------------------
function applyFallback(result, now, inStartupGrace = false) {
  badFrameCount++;

  const trackingActive = hasActiveTracking();
  const heldH = getHeldPose(now);

  // -------------------------
  // LOG (matches actual logic order)
  // -------------------------
  console.warn("⚠️ FALLBACK REASON", {
    reason: heldH
      ? "holding_last_pose"
      : trackingActive
      ? "tracking_active_but_no_H"
      : inStartupGrace
      ? "startup_grace"
      : badFrameCount > MAX_BAD_FRAMES
      ? "too_many_bad_frames"
      : "unknown",

    badFrameCount,
    trackingActive,
    inStartupGrace,
    hasHeldPose: !!heldH,
  });

  // -------------------------
  // 1. Use held pose (best case)
  // -------------------------
  if (heldH) {
    console.warn("🟡 HOLDING LAST GOOD POSE");

    result.H = heldH;
    result.isRecovered = true;
    result.isLost = false;
    result.isFresh = false;

    return result;
  }

  // -------------------------
  // 2. Flow still active → recover
  // -------------------------
  if (trackingActive) {
    console.warn("🟡 HOLDING FLOW (no reset)");

    result.H = null; // poseController should hold
    result.isRecovered = true;
    result.isLost = false;
    result.isFresh = false;

    return result;
  }

  // -------------------------
  // 3. Startup grace → recover
  // -------------------------
  if (inStartupGrace) {
    console.warn("🟡 STARTUP GRACE");

    result.H = null;
    result.isRecovered = true;
    result.isLost = false;
    result.isFresh = false;

    return result;
  }

  // -------------------------
  // 4. Confirmed loss
  // -------------------------
  if (badFrameCount > MAX_BAD_FRAMES) {
    console.warn("💀 FLOW RESET (confirmed lost)");

    resetOpticalFlowState();
    badFrameCount = 0;

    result.H = null;
    result.isRecovered = false;
    result.isLost = true;
    result.isFresh = false;

    return result;
  }

  // -------------------------
  // 5. Default fallback
  // -------------------------
  result.H = null;
  result.isRecovered = true;
  result.isLost = false;
  result.isFresh = false;

  return result;
}

// -----------------------------
// Get matches
// -----------------------------
function getBestMatches(frame, map) {
  const keyframeIds = Object.keys(map.keyframes);
  if (keyframeIds.length === 0) return [];

  const keyframeId = keyframeIds[keyframeIds.length - 1];
  const keyframe = map.keyframes[keyframeId];
  if (!keyframe) return [];

  const keyframeFeatures = keyframe.descriptorIds
    .map((id) => map.descriptors[id])
    .filter(Boolean);

  if (!keyframeFeatures.length) return [];

  if (!workerBusy) {
    workerBusy = true;
    const jobId = ++currentJobId;

    console.log("MATCHER REQUEST:", {
      jobId,
      mapFeatures: keyframeFeatures.length,
    });

    matcherWorker.postMessage({
      jobId,
      imageData: frame,
      mapFeatureSets: [keyframeFeatures],
    });
  }

  const age = Date.now() - latestMatchTime;
  const cacheValid = latestMatches && age < MAX_MATCH_AGE;

  console.log("MATCH CACHE:", {
    hasLatest: !!latestMatches,
    latestCount: latestMatches?.length || 0,
    age,
    cacheValid,
    workerBusy,
  });

  if (cacheValid) {
    return latestMatches;
  }

  return [];
}

export function runTrackingStep(frame, map) {
  console.log("---- TRACK STEP ----");

  const result = {
    H: null,
    matchCount: 0,
    isFresh: false,
    isRecovered: false,
    isLost: false,
  };

  if (!frame || !map || !map.keyframes || !map.descriptors) {
    console.log("INVALID INPUT");
    return applyFallback(result, Date.now(), false);
  }

  const now = Date.now();

  if (!trackingStartTime) {
    trackingStartTime = now;
  }

  const inStartupGrace = now - trackingStartTime < STARTUP_GRACE_MS;

  let source = "none";

  // -----------------------------
  // FLOW
  // -----------------------------
  let tracked = null;
  let flowCount = 0;
  let flowFailing = true;

  if (hasActiveTracking()) {
    console.log("FLOW: active");

    tracked = trackPointsWithOpticalFlow(frame);

    flowCount = tracked?.trackedMatches?.length || 0;
    console.log("FLOW matches:", flowCount);

    flowFailing = !tracked?.ok || flowCount < 6;

    if (tracked?.ok && flowCount >= 6) {
      const homography = computeHomographyDetailed(tracked.trackedMatches, {
        mode: "flow",
      });

      if (homography?.H) {
        console.log("FLOW: H OK");

        result.H = homography.H;
        result.matchCount = flowCount;
        source = "flow";

        badFrameCount = 0;
        storeGoodPose(homography.H, now);
      } else {
        console.log("FLOW: H FAILED");
      }
    } else {
      console.log("FLOW: insufficient matches");
    }
  } else {
    console.log("FLOW: inactive");
  }

  // -----------------------------
  // MATCHER (FIXED LOGIC)
  // -----------------------------
  const shouldRematch =
    flowFailing ||
    (!workerBusy && now - lastRematchTime > REMATCH_INTERVAL_MS);

  if (shouldRematch) {
    console.log("MATCHER: attempt");

    const matches = getBestMatches(frame, map);

    console.log("MATCHES:", matches.length);

    if (matches.length >= MIN_MATCHES_FOR_H) {
      const avgDist =
        matches.reduce((sum, m) => sum + (m.dist || 0), 0) / matches.length;

      console.log("MATCH avgDist:", avgDist);

      if (avgDist <= MAX_AVG_MATCH_DIST) {
        const homography = computeHomographyDetailed(matches, {
          mode: "matcher",
        });

        if (homography?.H) {
          console.log("MATCHER: H OK");

          result.H = homography.H;
          result.matchCount = matches.length;
          result.isFresh = true;
          source = "matcher";

          lastRematchTime = now;
          badFrameCount = 0;

          // ✅ ONLY RESET FLOW IF IT WAS ACTUALLY WEAK
          const flowWasHealthy = !flowFailing && flowCount >= MIN_GOOD_MATCHES;

          if (!flowWasHealthy) {
            console.log("FLOW: reinitialising (was weak)");
            resetOpticalFlowState();
            initializeTrackingFromInliers(frame, homography.inlierMatches);
          } else {
            console.log("FLOW: preserved (healthy)");
            initializeTrackingFromInliers(frame, homography.inlierMatches);
          }

          storeGoodPose(homography.H, now);
        } else {
          console.log("MATCHER: H FAILED");
        }
      } else {
        console.log("MATCHER: bad distance");
      }
    } else {
      console.log("MATCHER: not enough matches");
    }
  }

  // -----------------------------
  // DECISION
  // -----------------------------
  if (result.H) {
    console.log("📌 TRACK RESULT", {
      source,
      hasH: true,
      matchCount: result.matchCount,
      badFrames: badFrameCount,
    });

    return result;
  }

  const fallback = applyFallback(result, now, inStartupGrace);

  console.log("📌 TRACK RESULT", {
    source: "fallback",
    hasH: !!fallback.H,
    badFrames: badFrameCount,
  });

  return fallback;
}
