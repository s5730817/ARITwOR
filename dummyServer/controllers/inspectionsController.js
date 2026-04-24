import { saveInspectionSession } from "../services/inspectionsService.js";

export async function saveInspection(req, res) {
  try {
    const payload = req.body;

    // ✅ FIXED FIELD NAME
    if (!payload || !payload.id || !payload.featureMapId) {
      return res.status(400).json({
        error: "Invalid inspection payload"
      });
    }

    const result = await saveInspectionSession(payload);

    res.status(200).json({
      success: true,
      path: result.path
    });

  } catch (err) {
    console.error("Save inspection error:", err);

    res.status(500).json({
      error: "Failed to save inspection"
    });
  }
}