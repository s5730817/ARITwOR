export function extractCameraFeatures(frame) {
  const cv = window.cv;

  if (!frame || !cv) return [];

  let mat;
  try {
    mat = cv.matFromImageData(frame);
  } catch (e) {
    return [];
  }

  if (!mat || mat.rows === 0 || mat.cols === 0) {
    return [];
  }

  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();

  const orb = new cv.ORB(600, 1.2, 8, 31, 0, 2, cv.ORB_HARRIS_SCORE, 31, 20);
  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  const features = [];

  for (let i = 0; i < keypoints.size(); i++) {
    const kp = keypoints.get(i);

    const descriptor = [];
    for (let j = 0; j < descriptors.cols; j++) {
      descriptor.push(descriptors.ucharAt(i, j));
    }

    if (descriptor.length === 32) {
      features.push({
        x: kp.pt.x,
        y: kp.pt.y,
        descriptor,
        response: kp.response
      });
    }
  }

  mat.delete();
  gray.delete();
  keypoints.delete();
  descriptors.delete();
  orb.delete();

  return features;
}