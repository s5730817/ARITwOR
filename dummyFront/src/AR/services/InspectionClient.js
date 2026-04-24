// -----------------------------
// Save inspection session
// -----------------------------
export async function saveInspectionSession(payload) {
  // 🔥 BASIC VALIDATION
  if (!payload || !payload.id) {
    throw new Error("Invalid inspection payload: missing id");
  }

  if (!payload.featureMapId) {
    throw new Error("Invalid inspection payload: missing featureMapId");
  }

  if (!Array.isArray(payload.annotations)) {
    throw new Error("Invalid inspection payload: annotations missing");
  }

  if (!Array.isArray(payload.inspections)) {
    throw new Error("Invalid inspection payload: inspections missing");
  }

  // 🔍 DEBUG (you’ll thank yourself later)
  console.log("📤 Sending inspection session:", payload);

  const response = await fetch("/api/inspections", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  // 🔥 BETTER ERROR HANDLING
  if (!response.ok) {
    const text = await response.text();

    console.error("❌ Server response:", text);

    throw new Error(
      `Failed to save inspection: ${response.status}`
    );
  }

  const data = await response.json();

  console.log("✅ Inspection saved:", data);

  return data;
}