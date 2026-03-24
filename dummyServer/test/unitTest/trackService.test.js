import { buildFeatureMap } from "../services/featureMapService.js";

async function testTracks() {
  console.log("🧪 Track Test\n");

  const result = await buildFeatureMap();

  const tracks = result.tracks;

  const firstTrack = Object.values(tracks)[0];

  console.log("Tracks:", Object.keys(tracks).length);

  console.log("\n🔍 Sample track:");
  console.log({
    id: firstTrack.id,
    descriptorCount: firstTrack.descriptors.length
  });

  // ✅ Assertions
  if (firstTrack.descriptors.length < 2) {
    throw new Error("Track too small");
  }

  console.log("✅ Track test passed\n");
}

testTracks();