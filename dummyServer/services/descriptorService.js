import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

let descriptorCount = 0;

export function createDescriptorsFromImage(imagePath, keyframeId) {
  return new Promise((resolve, reject) => {

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const scriptPath = path.join(__dirname, "../python/feature_extractor.py");

    execFile(
      "python",
      [scriptPath, imagePath],
      (error, stdout, stderr) => {

        if (error) {
          console.error("❌ Python error:", stderr);
          return reject(error);
        }

        let raw;
        try {
          raw = JSON.parse(stdout);
        } catch (parseErr) {
          console.error("❌ Failed to parse Python output");
          console.error(stdout);
          return reject(parseErr);
        }

        const descriptors = {};
        const descriptorIds = [];

        for (const item of raw) {
          const id = `d_${descriptorCount++}`;

          descriptors[id] = {
            id,
            keyframeId,

            // 🔥 CRITICAL (you already had this ✔)
            x: item.x,
            y: item.y,

            // ORB descriptor
            vector: item.vector,

            // 🔥 future-proof (for tracks)
            trackId: null
          };

          descriptorIds.push(id);
        }

        resolve({ descriptors, descriptorIds });
      }
    );
  });
}