self.extractCameraFeatures = function(frame) {
  if (!frame || !frame.data) return [];

  const cv = self.cv;
  if (!cv) {
    console.warn("cv not ready in cameraFeatures.worker");
    return [];
  }

  let mat;
  try {
    mat = cv.matFromImageData({
      data: frame.data,
      width: frame.width,
      height: frame.height
    });
  } catch (e) {
    console.warn("Failed to build Mat", e);
    return [];
  }

  if (!mat || mat.rows === 0 || mat.cols === 0) {
    console.warn("Invalid source Mat");
    return [];
  }

  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();
  const orb = new cv.ORB();

  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  console.log("EXTRACTOR:", {
    keypoints: keypoints.size(),
    descRows: descriptors.rows,
    descCols: descriptors.cols,
    descType: descriptors.type(),
  });

  const features = [];
  let badRows = 0;

  for (let i = 0; i < keypoints.size(); i++) {
    if (i >= descriptors.rows) {
      badRows++;
      continue;
    }

    const kp = keypoints.get(i);
    const desc = [];

    for (let j = 0; j < descriptors.cols; j++) {
      desc.push(descriptors.ucharPtr(i, j)[0]);
    }

    if (desc.length !== 32) {
      badRows++;
      continue;
    }

    features.push({
      x: kp.pt.x,
      y: kp.pt.y,
      descriptor: desc
    });
  }

  console.log("EXTRACTOR OUT:", {
    produced: features.length,
    badRows,
    sampleDescLen: features[0]?.descriptor?.length || 0,
  });

  mat.delete();
  gray.delete();
  keypoints.delete();
  descriptors.delete();
  orb.delete();

  return features;
};