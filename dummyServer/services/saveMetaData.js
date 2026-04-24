import fs from "fs";
import path from "path";

// -----------------------------
// Save Metadata (ASYNC SAFE)
// -----------------------------
export const saveMetadata = async (files, session, objectType) => {

  const datasetRoot = path.join(process.cwd(), "dataset");
  const metadataPath = path.join(datasetRoot, "metadata.json");

  let metadata = [];

  try {
    if (fs.existsSync(metadataPath)) {
      const raw = fs.readFileSync(metadataPath);
      metadata = JSON.parse(raw);
    }

    files.forEach(file => {
      metadata.push({
        filename: path.relative(datasetRoot, file.path),
        session,
        objectType,
        timestamp: new Date().toISOString()
      });
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log("📋 Metadata updated");

  } catch (err) {
    console.error("❌ Failed to save metadata:", err);
  }
};