import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// -----------------------------
// ESM __dirname fix
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------
// BASE DIRECTORY
// -----------------------------
// ⚠️ CURRENT: local filesystem storage
// ⚠️ DB: replace with inspection_sessions table
const BASE_DIR = path.join(__dirname, "../dataset/inspections");


/**
 * Save Inspection Session
 *
 * CURRENT:
 * - Saves inspection session as JSON file
 * - Each session stored in its own folder
 * - Entire payload written directly (no transformation)
 *
 * FUTURE (DATABASE INTEGRATION):
 * - Replace ALL fs operations with DB insert
 * - Store as JSON field OR split into relational tables
 *
 * DATA CONTRACT: InspectionSession
 *
 * {
 *   id: string,                 // UUID (PRIMARY KEY)
 *   featureMapId: string,       // FK → feature_maps.id (INDEX THIS)
 *   entityId: string|null,      // FK → entity.id (optional)
 *
 *   createdAt: string,          // ISO timestamp
 *   updatedAt: string,          // ISO timestamp
 *
 *   annotationCount: number,
 *
 *   annotations: [
 *     {
 *       id: string|number,
 *
 *       mapX: number,
 *       mapY: number,
 *
 *       featureId: string|null,
 *       offsetX: number,
 *       offsetY: number,
 *
 *       title: string,
 *       note: string,                // 🔹 ORIGINAL annotation instruction
 *
 *       // 🔥 INSPECTION EXTENSIONS
 *       inspectionNote: string,      // 🔹 inspector input (e.g. "leaking pipe")
 *       inspectionResult: string,    // "functional" | "defective"
 *
 *       status: string,              // "pending" | "checked"
 *       updatedAt: string|null
 *     }
 *   ],
 *
 *   inspections: [
 *     {
 *       id: string,                 // UUID
 *
 *       mapX: number,
 *       mapY: number,
 *
 *       featureId: string|null,
 *       offsetX: number,
 *       offsetY: number,
 *
 *       title: string,
 *       note: string,               // 🔹 fault description
 *
 *       inspectionResult: string,   // usually "defective"
 *       status: string,
 *
 *       createdAt: string
 *     }
 *   ]
 * }
 *
 * DB NOTES:
 * - id → UUID PRIMARY KEY
 * - featureMapId → INDEXED FOREIGN KEY
 * - annotations + inspections:
 *     Option A → store as JSON (fastest, simplest)
 *     Option B → split into tables:
 *         - inspection_annotations
 *         - inspection_faults
 *
 * STORAGE STRATEGY:
 *
 * {
 *   data: JSON.stringify({
 *     annotations,
 *     inspections
 *   })
 * }
 *
 * RETRIEVAL:
 *
 * const { annotations, inspections } = JSON.parse(data);
 *
 * IMPORTANT:
 * - NO transformation between frontend and backend
 * - Structure must remain consistent with AR system
 */


export async function saveInspectionSession(payload) {

  // -----------------------------
  // BASIC VALIDATION
  // -----------------------------
  if (!payload || !payload.id) {
    throw new Error("Missing inspection id");
  }

  if (!payload.featureMapId) {
    throw new Error("Missing featureMapId");
  }

  // -----------------------------
  // NORMALISE (LIGHT — DO NOT MUTATE STRUCTURE)
  // -----------------------------
  const inspectionSession = {
    ...payload,
    updatedAt: new Date().toISOString(),
    annotationCount: payload.annotations?.length || 0
  };

  // -----------------------------
  // CREATE SESSION DIRECTORY
  // -----------------------------
  const sessionDir = path.join(BASE_DIR, `session_${inspectionSession.id}`);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // -----------------------------
  // SAVE JSON FILE
  // -----------------------------
  const filePath = path.join(sessionDir, "inspection.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify(inspectionSession, null, 2)
  );

  console.log("💾 Inspection session saved:", filePath);

  // -----------------------------
  // RETURN PATH (for controller)
  // -----------------------------
  return {
    path: filePath
  };
}