import {
  getAllFeatureMaps,
  getFeatureMapById,
  buildFeatureMap
} from "../services/featureMapsService.js";


// -----------------------------
// GET /featureMaps?type=vehicle
// -----------------------------
export function fetchFeatureMaps(req, res) {
  try {
    const { type } = req.query;

    const maps = getAllFeatureMaps(type);

    res.json(maps);

  } catch (err) {
    console.error("Error fetching feature maps:", err);
    res.status(500).json({ error: "Server error" });
  }
}


// -----------------------------
// GET /featureMaps/:id
// -----------------------------
export function fetchFeatureMapById(req, res) {
  try {
    const { id } = req.params;

    const map = getFeatureMapById(id);

    if (!map) {
      return res.status(404).json({ error: "Feature map not found" });
    }

    res.json(map);

  } catch (err) {
    console.error("Error fetching feature map:", err);
    res.status(500).json({ error: "Server error" });
  }
}


// -----------------------------
// POST /featureMaps
// -----------------------------
export const createFeatureMap = async (req, res) => {
  try {
    // -----------------------------
    // Validate upload
    // -----------------------------
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // -----------------------------
    // Extract data
    // -----------------------------
    const sessionId = req.body.sessionId || `sess_${Date.now()}`;
    const sessionName = req.body.sessionName || "Unnamed Map";
    const objectType = req.body.objectType || "unknown_type";

    console.log(`🚀 Creating feature map for: ${sessionId}/${objectType}`);

    // -----------------------------
    // Convert multer files → paths
    // -----------------------------
    const inputImages = req.files.map(file => file.path);

    // -----------------------------
    // Build feature map
    // -----------------------------
    const featureMap = await buildFeatureMap(
      inputImages,
      objectType,
      sessionName
    );

    console.log(`✅ Feature map created: ${featureMap.id}`);

    // -----------------------------
    // Response
    // -----------------------------
    res.status(200).json({
      success: true,
      message: "Feature map created successfully",
      fileCount: req.files.length,
      featureMapId: featureMap.id
    });

  } catch (error) {
    console.error("🔥 Error creating feature map:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};