import { useEffect, useRef, useState } from "react";
import { getNormalizedPoint } from "./../utils/input";
import { projectFeatureToScreen, projectScreenToMap } from "./../utils/featureProjection";
import { runTrackingStep, resetTrackingState } from "./../utils/trackingController";
import { getMapById } from "./../services/MapStorage";
import { updatePose, getDisplayPose, resetPose } from "./../utils/poseController";
import { extractFeatures } from "./../utils/featureAdapter";
import "./styles/annotationCanvas.css";

// tunables

const CORRECTION_X = -5; 
const CORRECTION_Y = 0;
const DEFAULT_DOT_COLOUR = "#00ff88";

function isValidHomography(H) {
  if (!Array.isArray(H) || H.length !== 9) return false;
  for (let i = 0; i < 9; i++) {
    if (!Number.isFinite(H[i])) return false;
  }
  return Math.abs(H[8]) > 1e-8;
}

function getVideoTransform(canvas, video) {
  if (!video) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const rect = canvas.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;

  const scale = Math.max(cw / vw, ch / vh);

  const displayedWidth = vw * scale;
  const displayedHeight = vh * scale;

  const offsetX = (cw - displayedWidth) / 2;
  const offsetY = (ch - displayedHeight) / 2;

  return { scale, offsetX, offsetY };
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== "string") {
    return `rgba(0,255,136,${alpha})`;
  }

  const clean = hex.replace("#", "");

  if (clean.length !== 6) {
    return `rgba(0,255,136,${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

// -----------------------------
// Find nearest feature
// -----------------------------
function findNearestFeature(mapPoint, features) {
  if (!mapPoint || !features || features.length === 0) {
    return null;
  }

  let best = null;
  let bestDist = Infinity;

  for (const feature of features) {
    const dx = mapPoint.x - feature.x;
    const dy = mapPoint.y - feature.y;
    const dist = dx * dx + dy * dy;

    if (dist < bestDist) {
      bestDist = dist;
      best = feature;
    }
  }

  return best;
}

function AnnotationCanvas({
  mapId,
  setDebugText,
  captureFrame,
  videoRef,
  annotations = [],
  selectedId = null,
  onSelect = () => {},
  onCreateAnnotation = () => {}
}) {
  const canvasRef = useRef(null);

  const [map, setMap] = useState(null);

  const mapRef = useRef(null);
  const animationFrameRef = useRef(null);
  const trackingTimerRef = useRef(null);
  const isMountedRef = useRef(false);
  const isTrackingRef = useRef(false);

 const lastGoodMarkersRef = useRef(new Map());

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (trackingTimerRef.current) {
        clearTimeout(trackingTimerRef.current);
      }
    };
  }, []);

  // -----------------------------
  // Load map
  // -----------------------------
  useEffect(() => {
    async function loadMap() {
      resetTrackingState();
      resetPose();

      lastGoodMarkersRef.current = new Map();

      const loadedMap = await getMapById(mapId);

      if (!isMountedRef.current) return;

      if (!loadedMap) {
        setMap(null);
        setDebugText("❌ Map failed");
        return;
      }

      const featureMap = loadedMap.featureMap || loadedMap;

      setMap(featureMap);

      const descriptorCount = featureMap.descriptors
        ? Object.keys(featureMap.descriptors).length
        : 0;

      console.log("FEATURE MAP LOADED:", featureMap);
      console.log("DESCRIPTORS:", featureMap.descriptors?.length);
      console.log("KEYPOINTS:", featureMap.keypoints?.length);
    }

    loadMap();
  }, [mapId, setDebugText]);

  // -----------------------------
  // Resize canvas
  // -----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();

    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  // -----------------------------
  // Pointer interaction
  // -----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !map) return;

    const handlePointer = (e) => {
      const H = getDisplayPose();

      if (!isValidHomography(H)) {
        setDebugText("Scanning...");
        return;
      }

      const point = getNormalizedPoint(
        { clientX: e.clientX, clientY: e.clientY },
        canvas
      );

      const screenX = point.nx * canvas.width;
      const screenY = point.ny * canvas.height;

      const video = videoRef?.current;

      const transform = getVideoTransform(canvas, video);

      if (!transform) return;

      const { scale, offsetX, offsetY } = transform;

      const frameX = (screenX - offsetX) / scale;
      const frameY = (screenY - offsetY) / scale;

      const mapPoint = projectScreenToMap(frameX, frameY, H);

      if (
        !mapPoint ||
        !Number.isFinite(mapPoint.x) ||
        !Number.isFinite(mapPoint.y)
      ) {
        setDebugText("Projection failed");
        return;
      }

      const features = extractFeatures(map);

      const nearest = findNearestFeature(mapPoint, features);

      const item = {
        id: Date.now(),
        title: "",
        note: "",
        done: false,
        mapX: mapPoint.x,
        mapY: mapPoint.y,
        featureId: nearest ? nearest.id : null,
        offsetX: nearest ? mapPoint.x - nearest.x : 0,
        offsetY: nearest ? mapPoint.y - nearest.y : 0
      };

      onCreateAnnotation(item);
      onSelect(item.id);
    };

    canvas.addEventListener("pointerdown", handlePointer);

    return () => canvas.removeEventListener("pointerdown", handlePointer);
  }, [map, setDebugText, videoRef, onCreateAnnotation, onSelect]);

  const draw = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const homography = getDisplayPose();
  const hasH = isValidHomography(homography);

  const video = videoRef?.current;
  const transform = getVideoTransform(canvas, video);

  let nextFrameMarkers = [];

  // -----------------------------
  // Project markers (WITH FEATURE LOCKING)
  // -----------------------------
  if (hasH && transform && annotations.length > 0 && map) {
    const { scale, offsetX, offsetY } = transform;

    const features = extractFeatures(map);

    for (const marker of annotations) {
      let mapX = marker.mapX;
      let mapY = marker.mapY;

      // 🧠 FEATURE LOCKING
      if (marker.featureId) {
        const feature = features.find(f => f.id === marker.featureId);

        if (feature) {
          mapX = feature.x + marker.offsetX;
          mapY = feature.y + marker.offsetY;
        }
      }

      const projected = projectFeatureToScreen(
        { x: mapX, y: mapY },
        canvas,
        { homography }
      );

      if (
        projected &&
        Number.isFinite(projected.x) &&
        Number.isFinite(projected.y)
      ) {
        nextFrameMarkers.push({
          id: marker.id,
          x: projected.x * scale + offsetX + CORRECTION_X,
          y: projected.y * scale + offsetY + CORRECTION_Y,
          colour: marker.colour || DEFAULT_DOT_COLOUR
        });
      }
    }
  }

  // -----------------------------
  // 🧠 Screen-space smoothing (ADAPTIVE)
  // -----------------------------
  const prevMap = lastGoodMarkersRef.current;
  const newMap = new Map();

  let markersToDraw = [];

  if (nextFrameMarkers.length > 0) {
    for (const m of nextFrameMarkers) {
      const prev = prevMap.get(m.id);

      let x = m.x;
      let y = m.y;

      if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
        const dx = Math.abs(prev.x - m.x);
        const dy = Math.abs(prev.y - m.y);
        const dist = dx + dy;

        // 🎯 Adaptive smoothing
        const alpha = dist > 20 ? 0.9 : 0.7;

        x = prev.x * (1 - alpha) + x * alpha;
        y = prev.y * (1 - alpha) + y * alpha;
      }

      const smoothed = { ...m, x, y };

      newMap.set(m.id, smoothed);
      markersToDraw.push(smoothed);
    }

    lastGoodMarkersRef.current = newMap;

  } else {
    // fallback if tracking drops briefly
    markersToDraw = Array.from(prevMap.values());
  }

  // -----------------------------
  // Draw markers
  // -----------------------------
  for (const m of markersToDraw) {
    const selected = m.id === selectedId;

    const fillColour = m.colour || DEFAULT_DOT_COLOUR;

    const ringColour = hexToRgba(
      fillColour,
      selected ? 0.5 : 0.3
    );

    ctx.beginPath();
    ctx.arc(m.x, m.y, selected ? 14 : 10, 0, Math.PI * 2);
    ctx.fillStyle = fillColour;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(m.x, m.y, selected ? 22 : 16, 0, Math.PI * 2);
    ctx.strokeStyle = ringColour;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

  // -----------------------------
  // Render loop
  // -----------------------------
  useEffect(() => {
    const renderLoop = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [annotations, selectedId]);

// -----------------------------
// Tracking loop (FRAME-SYNCED)
// -----------------------------
  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    const loop = async () => {
      if (cancelled || !isMountedRef.current) return;

      // Only run if not already tracking
      if (!isTrackingRef.current) {
        const currentMap = mapRef.current;

        if (currentMap) {
          const frame = captureFrame?.();

          if (frame && !frame.bad) {
            isTrackingRef.current = true;

            try {
              const result = await runTrackingStep(frame, currentMap);

              if (!cancelled && isMountedRef.current) {
                updatePose(result);

                if (result.isLost) {
                  setDebugText("Scanning...");
                } else {
                  setDebugText(
                    `Ready ✓ F:${result.featureCount} M:${result.matchCount}`
                  );
                }
              }
            } finally {
              isTrackingRef.current = false;
            }
          }
        }
      }

      // 🔁 Immediately schedule next frame
      requestAnimationFrame(loop);
    };

    // 🚀 Start immediately (no delay)
    requestAnimationFrame(loop);

    return () => {
      cancelled = true;
    };
  }, [map, captureFrame, setDebugText]);

  return (
    <canvas
      ref={canvasRef}
      className="annotation-canvas"
    />
  );
}

export default AnnotationCanvas;