import fs from "fs";
import path from "path";

export const saveMetadata = (files, session, objectType) => {

  const datasetRoot = path.join(process.cwd(), "dataset");
  const metadataPath = path.join(datasetRoot, "metadata.json");

  let metadata = [];

  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath));
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
};