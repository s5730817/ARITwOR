import { createDescriptorsFromImage } from "../services/descriptorService.js";

async function testDescriptor() {
  console.log("🧪 Descriptor Test\n");

  const testImage = "./dataset/First key frame collection/bus_depot/1774277225003-337375400.jpg";

  const { descriptors, descriptorIds } =
    await createDescriptorsFromImage(testImage, "kf_test");

  console.log("Descriptors created:", descriptorIds.length);

  const sample = descriptors[descriptorIds[0]];

  console.log("\n🔍 Sample descriptor:");
  console.log({
    id: sample.id,
    x: sample.x,
    y: sample.y,
    vectorLength: sample.vector.length
  });

  // ✅ Assertions
  if (!sample.x || !sample.y) throw new Error("Missing x,y");
  if (sample.vector.length !== 32) throw new Error("Invalid ORB vector");

  console.log("✅ Descriptor test passed\n");
}

testDescriptor();