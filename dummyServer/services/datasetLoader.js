import fs from "fs";
import path from "path";

export function loadDataset(datasetPath) {
  const images = [];

  const sessions = fs.readdirSync(datasetPath);

  sessions.forEach(session => {
    const sessionPath = path.join(datasetPath, session);
    if (!fs.statSync(sessionPath).isDirectory()) return;

    const types = fs.readdirSync(sessionPath);

    types.forEach(type => {
      const typePath = path.join(sessionPath, type);
      if (!fs.statSync(typePath).isDirectory()) return;

      const files = fs.readdirSync(typePath);

      files.forEach(file => {
        const filePath = path.join(typePath, file);

        images.push({
          session,
          type,
          path: filePath
        });
      });
    });
  });

  return images;
}