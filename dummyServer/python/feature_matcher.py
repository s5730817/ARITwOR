import cv2
import sys
import json
import numpy as np

img1_path = sys.argv[1]
img2_path = sys.argv[2]

img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)

orb = cv2.ORB_create(nfeatures=500)

kp1, des1 = orb.detectAndCompute(img1, None)
kp2, des2 = orb.detectAndCompute(img2, None)

bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

good_matches = []

if des1 is not None and des2 is not None:

    matches = bf.match(des1, des2)

    if len(matches) >= 8:  # minimum for RANSAC

        pts1 = np.float32([kp1[m.queryIdx].pt for m in matches])
        pts2 = np.float32([kp2[m.trainIdx].pt for m in matches])

        # 🔥 RANSAC step
        F, mask = cv2.findFundamentalMat(pts1, pts2, cv2.FM_RANSAC)

        if mask is not None:
            for i, m in enumerate(matches):
                if mask[i]:  # only keep inliers
                    good_matches.append({
                        "img1_idx": m.queryIdx,
                        "img2_idx": m.trainIdx
                    })
    else:
        # fallback (too few matches)
        for m in matches:
            good_matches.append({
                "img1_idx": m.queryIdx,
                "img2_idx": m.trainIdx
            })

print(json.dumps(good_matches))