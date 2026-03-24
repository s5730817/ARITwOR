import { buildFeatureMap } from "./services/featureMapService.js";

async function runTest() {
  try {
    console.log("🧪 Running feature map test...\n");

    const result = await buildFeatureMap();

    const keyframes = result.featureMap?.keyframes || result.keyframes;
    const descriptors = result.featureMap?.descriptors || result.descriptors;
    const tracks = result.featureMap?.tracks || result.tracks;

    console.log("\n📊 RESULTS:");
    console.log("Keyframes:", Object.keys(keyframes).length);
    console.log("Descriptors:", Object.keys(descriptors).length);
    console.log("Tracks:", Object.keys(tracks).length);

    // 🔍 SAMPLE KEYFRAME
    const firstKeyframe = Object.values(keyframes)[0];
    console.log("\n🔍 Sample keyframe:");
    console.log({
      id: firstKeyframe.id,
      path: firstKeyframe.path,
      descriptorCount: firstKeyframe.descriptorIds.length
    });

    // 🔍 SAMPLE DESCRIPTOR
    const firstDescriptor = Object.values(descriptors)[0];
    console.log("\n🔍 Sample descriptor:");
    console.log({
      id: firstDescriptor.id,
      keyframeId: firstDescriptor.keyframeId,
      x: firstDescriptor.x,
      y: firstDescriptor.y,
      vectorLength: firstDescriptor.vector.length,
      trackId: firstDescriptor.trackId
    });

    // 🔍 SAMPLE TRACK
    const firstTrack = Object.values(tracks)[0];
    console.log("\n🔍 Sample track:");
    console.log({
      id: firstTrack.id,
      descriptorCount: firstTrack.descriptors.length,
      sampleDescriptors: firstTrack.descriptors.slice(0, 5)
    });

    // 🔥 VALIDATION CHECKS
    console.log("\n🧪 VALIDATION:");

    // Check descriptor has position
    if (firstDescriptor.x !== undefined && firstDescriptor.y !== undefined) {
      console.log("✅ Descriptors contain (x, y)");
    } else {
      console.log("❌ Descriptors missing (x, y)");
    }

    // Check vector size (ORB should be 32 bytes = 32 length)
    if (firstDescriptor.vector.length === 32) {
      console.log("✅ Descriptor vector length correct (ORB)");
    } else {
      console.log("⚠️ Unexpected descriptor length:", firstDescriptor.vector.length);
    }

    // Check track linkage
    if (firstDescriptor.trackId) {
      console.log("✅ Descriptor linked to track");
    } else {
      console.log("⚠️ Descriptor not linked to track");
    }

  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

runTest();