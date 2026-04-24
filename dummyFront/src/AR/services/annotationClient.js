// -----------------------------
// Save annotations
// -----------------------------
export async function saveAnnotations(payload) {
  let response = await fetch("/api/annotations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 409) {
    const confirmOverwrite = window.confirm(
      "Map already exists. Overwrite it?"
    );

    if (!confirmOverwrite) {
      throw new Error("User cancelled overwrite");
    }

    response = await fetch("/api/annotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        overwrite: true
      })
    });
  }

  if (!response.ok) {
    throw new Error(
      `Failed to save annotations: ${response.status}`
    );
  }

  return await response.json();
}

// -----------------------------
// Load single annotation map
// -----------------------------
export async function fetchAnnotations(featureMapId) {
  const response = await fetch(
    `/api/annotations/byFeatureMap/${featureMapId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch annotations for ${featureMapId}`
    );
  }

  const data = await response.json();

  console.log("FETCHED ANNOTATION RESPONSE:", data); // 🔥 ADD THIS

  return data;
}

// -----------------------------
// Fetch ALL annotation maps
// -----------------------------
export async function fetchAllAnnotationMaps() {
  const response = await fetch("/api/annotations");

  if (!response.ok) {
    throw new Error("Failed to fetch annotation maps");
  }

  return await response.json();
}

// -----------------------------
// Download annotation map (JSON)
// -----------------------------
export function downloadAnnotationMap(featureMapId) {
  window.open(`/api/annotations/${featureMapId}`, "_blank");
}