import { useRef, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);

  const darkFrameCountRef = useRef(0);
  const lastGoodFrameRef = useRef(null);

  // -----------------------------
  // Start camera (STABLE)
  // -----------------------------
  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    });

    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    video.setAttribute("playsinline", true);
    video.setAttribute("muted", true);

    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    await video.play();
  }, []);

  // -----------------------------
  // Capture frame (STABLE)
  // -----------------------------
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;

    if (
      video.readyState < 1 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement("canvas");
    }

    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    // -----------------------------
    // brightness check
    // -----------------------------
    let sum = 0;

    for (let i = 0; i < imageData.data.length; i += 16) {
      sum += imageData.data[i];
    }

    const avg = sum / (imageData.data.length / 16);

    const DARK_FRAME_THRESHOLD = 3;

    if (avg < 2) {
      darkFrameCountRef.current++;

      console.log("⚠️ dark frame detected:", darkFrameCountRef.current);

      if (darkFrameCountRef.current > DARK_FRAME_THRESHOLD) {
        return { bad: true };
      }

      return lastGoodFrameRef.current || imageData;
    }

    darkFrameCountRef.current = 0;
    lastGoodFrameRef.current = imageData;

    return imageData;
  }, []);

  return {
    videoRef,
    startCamera,
    captureFrame
  };
}