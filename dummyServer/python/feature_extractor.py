import cv2
import sys
import json
import os

image_path = sys.argv[1]

# 🔒 Safety check
if not os.path.exists(image_path):
    print(json.dumps([]))
    sys.exit(0)

# Load image
image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

if image is None:
    print(json.dumps([]))
    sys.exit(0)

# ORB detector
orb = cv2.ORB_create(nfeatures=500)

# Detect + compute
keypoints, descriptors = orb.detectAndCompute(image, None)

result = []

if descriptors is not None:
    for i, kp in enumerate(keypoints):
        result.append({
            "x": float(kp.pt[0]),
            "y": float(kp.pt[1]),

            #  descriptor (binary vector)
            "vector": descriptors[i].tolist(),

            #  optional but VERY useful later
            "size": float(kp.size),
            "angle": float(kp.angle)
        })

# Always return valid JSON
print(json.dumps(result))