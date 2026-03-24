import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { loadDataset } from "./datasetLoader.js";
import { createDescriptorsFromImage } from "./descriptorService.js";
import { buildTracks } from "./trackService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildFeatureMap() {

  const datasetPath = path.join(__dirname, "../dataset");

  const images = loadDataset(datasetPath);

  const keyframes = {};
  let descriptors = {};

  console.log("📂 Processing images...\n");

  let index = 0;

  for (const img of images) {

    const keyframeId = `kf_${index++}`;

    try {
      const { descriptors: newDescs, descriptorIds } =
        await createDescriptorsFromImage(img.path, keyframeId);

      // merge descriptors
      descriptors = { ...descriptors, ...newDescs };

      // store keyframe
      keyframes[keyframeId] = {
        id: keyframeId,
        path: img.path,

        session: img.session,
        type: img.type,

        descriptorIds: descriptorIds
      };

      console.log(`✅ Processed ${img.path} (${descriptorIds.length} features)`);

    } catch (err) {
      console.error("❌ Failed image:", img.path);
      console.error(err);
    }
  }

  console.log("\n🔗 Building tracks...");

  const tracks = await buildTracks(keyframes, descriptors);

  // 🔥 FINAL FEATURE MAP (DB READY)
  const featureMap = {
    id: `fm_${Date.now()}`,

    session: images[0]?.session || "unknown",
    type: images[0]?.type || "unknown",

    date: new Date().toISOString(),

    keyframes,
    descriptors,
    tracks
  };

  const outputPath = path.join(datasetPath, "featureMap.json");

  fs.writeFileSync(outputPath, JSON.stringify(featureMap, null, 2));

  console.log("\n💾 Feature map saved:", outputPath);

  return featureMap;
}