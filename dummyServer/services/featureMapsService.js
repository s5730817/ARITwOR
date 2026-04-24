import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

import { createDescriptorsFromImage } from "./descriptorService.js";
import { buildTracks } from "./trackService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// Build Feature Map
// -----------------------------
/**
 * Build Feature Map
 *
 * CURRENT:
 * - Loads images from local filesystem (multer upload directory)
 * - Generates descriptors per image
 * - Builds feature tracks across keyframes
 * - Saves result as JSON file
 * - Updates local registry (featureMaps.json)
 *
 * FUTURE (DATABASE INTEGRATION):
 * - Replace ALL fs operations with DB queries/inserts
 * - Images should NOT be read from local disk (use storage service / blob refs)
 * - Registry should be replaced with indexed DB query
 *
 * DATA CONTRACT: FeatureMap
 *
 * {
 *   id: string,              // UNIQUE IDENTIFIER (e.g. "fm_...")
 *   sessionId: string,       // UNIQUE session reference
 *   session: string,         // human-readable name
 *   type: string,            // "vehicle" | "depot"
 *   entityId: string|null,   // UNIQUE IDENTIFIER: Foriegn Key. (vehicle/depot ID)
 *   date: string,            // ISO timestamp
 *
 *   keyframes: {
 *     [keyframeId: string]: {
 *       id: string,
 *       path: string,            // ⚠️ FILE PATH (REMOVE FOR DB)
 *       type: string,
 *       descriptorIds: string[]
 *     }
 *   },
 *
 *   descriptors: {
 *     [descriptorId: string]: {
 *       id: string,
 *       vector: number[],
 *       keyframeId: string
 *     }
 *   },
 *
 *   tracks: {
 *     [trackId: string]: {
 *       id: string,
 *       observations: {
 *         keyframeId: string,
 *         descriptorId: string
 *       }[]
 *     }
 *   }
 * }
 *
 * DB NOTES:
 * - id should become UUID (not Date.now)
 * - entityId should be indexed
 * - descriptors/tracks may need separate collections
 * - path should be replaced with image reference (URL / blob id)
 * DATA STORAGE NOTE:
 *
 * - keyframes, descriptors, and tracks are JavaScript objects (Record<string, Object>)
 * - These objects are JSON-compatible and should be stored as a single JSON field in the database
 *
 * STORAGE APPROACH:
 *
 * {
 *   data: JSON.stringify({
 *     keyframes,
 *     descriptors,
 *     tracks
 *   })
 * }
 *
 * RETRIEVAL:
 *
 * - On retrieval, the JSON field should be parsed back into objects:
 *
 *   const { keyframes, descriptors, tracks } = JSON.parse(data);
 *
 * - This restores the exact in-memory structure required by the tracking system
 *
 * IMPORTANT:
 *
 * - No transformation is required between in-memory objects and stored JSON
 * - Structure must remain unchanged to preserve descriptor and track relationships
 /** */



 export async function buildFeatureMap(
  inputImages,   // 👈 array of image paths or buffers
  objectType,
  sessionName,
  entityId = null
) {

  if (!inputImages || inputImages.length === 0) {
    throw new Error("No images provided");
  }

  const keyframes = {};
  let descriptors = {};

  console.log("📂 Processing images...\n");

  let index = 0;

  for (const img of inputImages) {

    const keyframeId = `kf_${index++}`;

    try {
      const { descriptors: newDescs, descriptorIds } =
        await createDescriptorsFromImage(img, keyframeId);

      descriptors = { ...descriptors, ...newDescs };

      keyframes[keyframeId] = {
        id: keyframeId,
        path: img, // ⚠️ DB: replace with imageRef (URL / blob ID)
        type: objectType,
        descriptorIds
      };

      console.log(`✅ Processed image (${descriptorIds.length} features)`);

    } catch (err) {
      console.error("❌ Failed image:", img);
      console.error(err);
    }
  }

  console.log("\n🔗 Building tracks...");

  const tracks = await buildTracks(keyframes, descriptors);

  // 🔥 FINAL FEATURE MAP OBJECT
  const featureMap = {
    id: `fm_${crypto.randomUUID()}`, // ⚠️ DB:  UUID (PRIMARY KEY)
    session: sessionName,
    type: objectType,
    entityId: entityId || null, // ⚠️ DB: FOREIGN KEY → entity.id (index this)
    date: new Date().toISOString(),
    keyframes,   // ⚠️ DB: store as JSON field
    descriptors, // ⚠️ DB: store as JSON field
    tracks       // ⚠️ DB: store as JSON field
  };

  // -----------------------------
  // SAVE MAP FILE (TEMP STORAGE)
  // -----------------------------
  // ⚠️ CURRENT: filesystem persistence
  // ⚠️ DB: replace with INSERT INTO feature_maps
  const rootDataset = path.join(__dirname, "../dataset");
  const mapsDir = path.join(rootDataset, "maps");

  if (!fs.existsSync(mapsDir)) {
    fs.mkdirSync(mapsDir, { recursive: true });
  }

  const filePath = path.join(mapsDir, `${featureMap.id}.json`);

  // ✅ FIX: actually save file
  fs.writeFileSync(filePath, JSON.stringify(featureMap, null, 2));

  console.log("💾 Feature map saved:", filePath);

  // -----------------------------
  // UPDATE REGISTRY (TEMP INDEX)
  // -----------------------------
  // ⚠️ CURRENT: JSON registry file
  // ⚠️ DB: replace with SELECT metadata query
  const registryPath = path.join(rootDataset, "featureMaps.json");

  let registry = [];

  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath));
  }

  registry.push({
    id: featureMap.id,          // ⚠️ DB: PRIMARY KEY reference
    name: sessionName,
    type: objectType,
    entityId: entityId || null, // ⚠️ DB: FOREIGN KEY (used for filtering)
    date: featureMap.date
  });

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

  console.log("📋 Registry updated");

  return featureMap;
}


// -----------------------------
// Get All Feature Maps
// -----------------------------
export function getAllFeatureMaps(type = null) {
  const datasetPath = path.join(__dirname, "../dataset");
  const registryPath = path.join(datasetPath, "featureMaps.json");

  // ⚠️ DB: replace with SELECT * FROM feature_maps (metadata only)

  if (!fs.existsSync(registryPath)) return [];

  const data = JSON.parse(fs.readFileSync(registryPath));

  if (type) {
    return data.filter((m) => m.type === type);
  }

  return data;
}


// -----------------------------
// Get Feature Map from ID
// -----------------------------
export function getFeatureMapById(id) {
  const datasetPath = path.join(__dirname, "../dataset");
  const filePath = path.join(datasetPath, "maps", `${id}.json`);

  // ⚠️ DB: replace with SELECT data FROM feature_maps WHERE id = ?

  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath));
}