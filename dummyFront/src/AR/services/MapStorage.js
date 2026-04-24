const DB_NAME = "ARMapsDB";
const DB_VERSION = 3; // 🔥 match annotationStorage
const STORE_NAME = "featureMaps";
const ANNOTATION_STORE = "annotationMaps";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      console.log("DB upgrade (MapStorage)");

      // ✅ feature maps store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      // ✅ ALSO ensure annotation store exists
      if (!db.objectStoreNames.contains(ANNOTATION_STORE)) {
        db.createObjectStore(ANNOTATION_STORE, { keyPath: "featureMapId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// Save map
// -----------------------------
export async function saveMap(map) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put(map);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// Get all maps
// -----------------------------
export async function getAllMaps() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// Get map by ID
// -----------------------------
export async function getMapById(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// WIPE DATABASE (HARD RESET)
// -----------------------------
export function wipeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn("Database deletion blocked");
    };
  });
}