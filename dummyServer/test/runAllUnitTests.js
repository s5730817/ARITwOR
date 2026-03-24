import path from "path";
import { fileURLToPath } from "url";

import { createDescriptorsFromImage } from "../services/descriptorService.js";
import { buildFeatureMap } from "../services/featureMapService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 adjust this path if needed
const TEST_IMAGE = path.join(
  __dirname,
  "../dataset/First key frame collection/bus_depot/1774277225003-337375400.jpg"
);

async function runDescriptorTest() {
  console.log("🧪 Descriptor Test\n");

  const { descriptors, descriptorIds } =
    await createDescriptorsFromImage(TEST_IMAGE, "kf_test");

  const sample = descriptors[descriptorIds[0]];

  console.log("Descriptors:", descriptorIds.length);
  console.log("Sample:", {
    x: sample.x,
    y: sample.y,
    vectorLength: sample.vector.length
  });

  if (!sample.x || !sample.y) throw new Error("❌ Missing x,y");
  if (sample.vector.length !== 32) throw new Error("❌ Invalid ORB vector");

  console.log("✅ Descriptor Test Passed\n");
}

async function runTrackTest() {
  console.log("🧪 Track Test\n");

  const result = await buildFeatureMap();

  const tracks = result.tracks;
  const firstTrack = Object.values(tracks)[0];

  console.log("Tracks:", Object.keys(tracks).length);
  console.log("Sample:", {
    id: firstTrack.id,
    descriptorCount: firstTrack.descriptors.length
  });

  if (firstTrack.descriptors.length < 2) {
    throw new Error("❌ Track too small");
  }

  console.log("✅ Track Test Passed\n");
}

async function runFeatureMapTest() {
  console.log("🧪 Feature Map Test\n");

  const result = await buildFeatureMap();

  console.log("ID:", result.id);
  console.log("Date:", result.date);

  console.log("Keyframes:", Object.keys(result.keyframes).length);
  console.log("Descriptors:", Object.keys(result.descriptors).length);
  console.log("Tracks:", Object.keys(result.tracks).length);

  const firstKeyframe = Object.values(result.keyframes)[0];

  console.log("Sample Keyframe:", {
    id: firstKeyframe.id,
    descriptorCount: firstKeyframe.descriptorIds.length
  });

  if (!result.id) throw new Error("❌ Missing ID");
  if (!result.date) throw new Error("❌ Missing date");

  console.log("✅ Feature Map Test Passed\n");
}

async function runAllTests() {
  console.log("🚀 Running All Tests\n");

  try {
    await runDescriptorTest();
    await runTrackTest();
    await runFeatureMapTest();

    console.log("🎉 ALL TESTS PASSED");
  } catch (err) {
    console.error("❌ TEST FAILED");
    console.error(err.message);
  }
}

runAllTests();