import { buildFeatureMap } from "../services/featureMapService.js";
import path from "path";

async function runTest() {
  console.log("🧪 Feature Map Test\n");

  const result = await buildFeatureMap();

  console.log("\n📊 RESULTS:");
  console.log("ID:", result.id);
  console.log("Session:", result.session);
  console.log("Type:", result.type);
  console.log("Date:", result.date);

  console.log("Keyframes:", Object.keys(result.keyframes).length);
  console.log("Descriptors:", Object.keys(result.descriptors).length);
  console.log("Tracks:", Object.keys(result.tracks).length);

  const firstKeyframe = Object.values(result.keyframes)[0];

  console.log("\n🔍 Sample keyframe:");
  console.log({
    id: firstKeyframe.id,
    file: path.basename(firstKeyframe.path),
    descriptorCount: firstKeyframe.descriptorIds.length
  });

  // ✅ Assertions
  if (!result.id) throw new Error("Missing feature map ID");
  if (!result.date) throw new Error("Missing date");

  console.log("\n✅ Feature map test passed\n");
}

runTest();
