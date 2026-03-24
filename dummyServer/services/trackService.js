import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const matcherPath = path.join(__dirname, "../python/feature_matcher.py");

let trackCount = 0;

export async function buildTracks(keyframes, descriptors) {

  const tracks = {};
  const descriptorToTrack = {}; 

  const keyframeList = Object.values(keyframes);

  for (let i = 0; i < keyframeList.length - 1; i++) {

    const kf1 = keyframeList[i];
    const kf2 = keyframeList[i + 1];

    const matches = await runMatcher(kf1.path, kf2.path);

    for (const match of matches) {

      const d1 = kf1.descriptorIds[match.img1_idx];
      const d2 = kf2.descriptorIds[match.img2_idx];

      if (!d1 || !d2) continue;

      const t1 = descriptorToTrack[d1];
      const t2 = descriptorToTrack[d2];

      // 🔥 CASE 1: neither in a track → create new
      if (!t1 && !t2) {
        const trackId = `t_${trackCount++}`;

        tracks[trackId] = {
          id: trackId,
          descriptors: [d1, d2]
        };

        descriptorToTrack[d1] = trackId;
        descriptorToTrack[d2] = trackId;

        descriptors[d1].trackId = trackId;
        descriptors[d2].trackId = trackId;
      }

      // 🔥 CASE 2: extend track t1
      else if (t1 && !t2) {
        tracks[t1].descriptors.push(d2);

        descriptorToTrack[d2] = t1;
        descriptors[d2].trackId = t1;
      }

      // 🔥 CASE 3: extend track t2
      else if (!t1 && t2) {
        tracks[t2].descriptors.push(d1);

        descriptorToTrack[d1] = t2;
        descriptors[d1].trackId = t2;
      }

      // 🔥 CASE 4: merge tracks
      else if (t1 && t2 && t1 !== t2) {

        const track1 = tracks[t1];
        const track2 = tracks[t2];

        // merge
        track1.descriptors.push(...track2.descriptors);

        // update all descriptors
        for (const d of track2.descriptors) {
          descriptorToTrack[d] = t1;
          descriptors[d].trackId = t1;
        }

        delete tracks[t2];
      }

      // CASE 5: already same track → do nothing
    }
  }

  return tracks;
}

// helper
function runMatcher(img1, img2) {
  return new Promise((resolve, reject) => {

    execFile(
      "python",
      [matcherPath, img1, img2],
      (err, stdout, stderr) => {

        if (err) {
          console.error("❌ Matcher error:", stderr);
          return reject(err);
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          console.error("❌ Failed to parse matcher output");
          console.error(stdout);
          reject(e);
        }
      }
    );
  });
}