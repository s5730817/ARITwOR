export function captureImage(videoRef, canvasRef, setTempImage) {

  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas) {
    alert("Video or canvas missing");
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    alert("Video not ready yet");
    return;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);

    const temp = {
      id: Date.now(),
      file: blob,
      preview: url,
      timestamp: new Date()
    };

    // 👇 IMPORTANT: goes to temp state
    setTempImage(temp);

  }, "image/jpeg", 0.95);
}