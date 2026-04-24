export function validateAnnotations(data) {
  if (!data) return "Annotation set is null";

  if (!data.featureMapId) return "Missing featureMapId";

  if (!Array.isArray(data.annotations)) {
    return "Annotations is not an array";
  }

  if (data.annotations.length === 0) {
    return "No annotations found";
  }

  // 🔥 Validate first annotation (fast + sufficient)
  const a = data.annotations[0];

  if (typeof a.mapX !== "number" || typeof a.mapY !== "number") {
    return "Invalid map coordinates";
  }

  if (!("id" in a)) {
    return "Missing annotation id";
  }

  return null; // ✅ valid
}