export async function uploadImages(images, setUploadStatus, sessionName, objectType) {

  const formData = new FormData();

  // Metadata
  formData.append("sessionName", sessionName);
  formData.append("objectType", objectType);
  formData.append("timestamp", new Date().toISOString());

  // Images
  images.forEach((img, index) => {
    formData.append("images", img.file, `image_${index}.jpg`);
  });

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    setUploadStatus(`✅ Upload successful (${data.fileCount} images)`);

  } catch (error) {
    setUploadStatus("❌ Upload failed");
  }
}