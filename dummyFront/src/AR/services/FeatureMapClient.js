// -----------------------------
// Upload all images captured and object + unique indentifier.
// -----------------------------
export async function uploadImages(
  images,
  setUploadStatus,
  sessionName,
  objectType,
  entityId
) {
  const formData = new FormData();

  const sessionId = `sess_${Date.now()}`;

  formData.append("sessionId", sessionId);
  formData.append("sessionName", sessionName);
  formData.append("objectType", objectType);
  formData.append("entityId", entityId ?? "");
  formData.append("timestamp", new Date().toISOString());

  images.forEach((img, index) => {
    formData.append("images", img.file, `image_${index}.jpg`);
  });

  try {
    const response = await fetch("/api/featureMaps", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Upload failed");
    }

    setUploadStatus(
      `✅ Feature map created (${data.fileCount} images)\nMap ID: ${data.featureMapId}`
    );

  } catch (error) {
    console.error("Upload error:", error);
    setUploadStatus("❌ Upload failed");
  }
}


// -----------------------------
// Fetch available maps (metadata)
// -----------------------------
export async function fetchAvailableMaps() {
  const res = await fetch("/api/featureMaps");

  if (!res.ok) {
    throw new Error(`Failed to fetch maps: ${res.status}`);
  }

  return await res.json();
}


// -----------------------------
// Fetch full feature map by ID
// -----------------------------
export async function fetchFeatureMapById(id) {
  const res = await fetch(`/api/featureMaps/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch map ${id}`);
  }

  return await res.json();
}


