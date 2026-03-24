import { saveMetadata } from "../services/metadataService.js";

export const handleUpload = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    const session = req.body.sessionName || "unknown_session";
    const objectType = req.body.objectType || "unknown_type";

    saveMetadata(req.files, session, objectType);

    res.status(200).json({
      success: true,
      message: "Upload successful",
      fileCount: req.files.length
    });

  } catch (error) {
    console.error("🔥 Upload error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};