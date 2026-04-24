const DB_NAME = "ARMapsDB";
const DB_VERSION = 3;
const STORE_NAME = "annotationMaps";

// -----------------------------
// Open DB (robust)
// -----------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      console.log("DB upgrade triggered");

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log("Creating store:", STORE_NAME);

        db.createObjectStore(STORE_NAME, {
          keyPath: "featureMapId" // ✅ standardised
        });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.warn("Store missing after open. Resetting DB...");

        db.close();
        indexedDB.deleteDatabase(DB_NAME);

        setTimeout(() => {
          openDB().then(resolve).catch(reject);
        }, 100);

        return;
      }

      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// Save annotation map
// -----------------------------
export async function saveAnnotationMapLocal(data) {
  const db = await openDB();
  console.log("Saving annotation map:", data);

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.put(data);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);

    tx.onerror = () => reject(tx.error);
  });
}

// -----------------------------
// Get annotation map by ID
// -----------------------------
export async function getAnnotationMapLocal(featureMapId) {
  const db = await openDB();

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(featureMapId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// -----------------------------
// Get all annotation maps
// -----------------------------
export async function getAllAnnotationMapsLocal() {
  const db = await openDB();

  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}