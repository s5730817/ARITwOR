import fs from "fs";
import path from "path";

const annotationRoot = path.join(
  process.cwd(),
  "dataset",
  "annotations"
);

// -----------------------------
// Annotation Service
// -----------------------------
/**
 * Annotation Service
 *
 * CURRENT:
 * - Stores annotation sets as JSON files on local filesystem
 * - One file per feature map session (id.json)
 * - Prevents duplicate saves unless overwrite = true
 * - Maintains createdAt / updatedAt timestamps
 *
 * FUTURE (DATABASE INTEGRATION):
 * - Replace ALL fs operations with DB queries
 * - Each record represents annotations linked to a feature map
 * - Enforce UNIQUE constraint on id (PRIMARY KEY)
 *
 * DATA CONTRACT:
 *
 * {
 *   id: string,
 *   featureMapId: string,
 *   entityId: string|null,
 *   createdAt: string,
 *   updatedAt: string,
 *   annotationCount: number,
 *   annotations: [...]
 * }
 *
 * PRIMARY KEY:
 * - id
 *
 * FOREIGN KEYS:
 * - featureMapId → FeatureMap.id
 * - entityId -> entityId.id
 *
 * IMPORTANT:
 * - Do NOT modify annotation structure between save/load
 * - Frontend relies on exact structure
 */

// -----------------------------
// Helpers
// -----------------------------
function ensureAnnotationFolder() {
  if (!fs.existsSync(annotationRoot)) {
    fs.mkdirSync(annotationRoot, { recursive: true });
  }
}

function getFilePath(id) {
  ensureAnnotationFolder();
  return path.join(annotationRoot, `${id}.json`);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// -----------------------------
// Check if annotations exist
// -----------------------------
export function annotationExists(id) {
  const filePath = getFilePath(id);
  return fs.existsSync(filePath);

  // DB:
  // SELECT 1 FROM annotations WHERE id = ?
}

// -----------------------------
// Save annotations
// -----------------------------
export function saveAnnotationMap(
  data,
  overwrite = false
) {
  const {
    id,
    featureMapId,
    entityId,
    createdAt,
    annotations = []
  } = data;

  if (!id) {
    throw new Error("Missing id");
  }

  const filePath = getFilePath(id);
  const exists = fs.existsSync(filePath);

  // Overwrite protection
  if (exists && !overwrite) {
    const error = new Error("EXISTS");
    error.code = 409;
    throw error;

    // DB:
    // SELECT id FROM annotations WHERE id = ?
  }

  let finalCreatedAt = createdAt || new Date().toISOString();

  if (exists) {
    try {
      const existing = readJSON(filePath);
      finalCreatedAt = existing.createdAt || finalCreatedAt;
    } catch {}

    // DB:
    // SELECT createdAt FROM annotations WHERE id = ?
  }

  const payload = {
    id,
    featureMapId,
    entityId: entityId || null,
    createdAt: finalCreatedAt,
    updatedAt: new Date().toISOString(),
    annotationCount: annotations.length,
    annotations
  };

  fs.writeFileSync(
    filePath,
    JSON.stringify(payload, null, 2)
  );

  // DB:
  // INSERT INTO annotations (id, featureMapId, entityId, data, createdAt, updatedAt)
  // VALUES (?, ?, ?, ?, ?, ?)
  // ON CONFLICT(id) DO UPDATE SET data=?, updatedAt=?

  return payload;
}

// -----------------------------
// Load annotations by feature map
// -----------------------------
export function getAnnotationsByFeatureMap(req, res) {
  try {
    const featureMapId = String(req.params.featureMapId).trim();

    const all = getAllAnnotationMaps();

    const matches = all.filter(
      (a) => a.featureMapId === featureMapId
    );

    if (!matches.length) {
      return res.json({
        featureMapId,
        annotations: []
      });

      // DB:
      // SELECT * FROM annotations WHERE featureMapId = ?
    }

    const latest = matches.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];

    return res.json(latest);

    // DB:
    // SELECT * FROM annotations
    // WHERE featureMapId = ?
    // ORDER BY updatedAt DESC
    // LIMIT 1

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to fetch annotations"
    });
  }
}

// -----------------------------
// Load annotations by ID
// -----------------------------
export function loadAnnotationMap(id) {
  const filePath = getFilePath(id);

  if (!fs.existsSync(filePath)) {
    return {
      id,
      annotations: []
    };

    // DB:
    // SELECT * FROM annotations WHERE id = ?
  }

  return readJSON(filePath);

  // DB:
  // SELECT * FROM annotations WHERE id = ?
}

// -----------------------------
// Get all annotation sets
// -----------------------------
export function getAllAnnotationMaps() {
  ensureAnnotationFolder();

  const files = fs.readdirSync(annotationRoot);

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      readJSON(path.join(annotationRoot, file))
    );

  // DB:
  // SELECT * FROM annotations
}