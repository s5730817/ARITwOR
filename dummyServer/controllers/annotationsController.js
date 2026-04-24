import crypto from "crypto";

import {
  saveAnnotationMap,
  loadAnnotationMap,
  getAllAnnotationMaps
} from "../services/annotationsService.js";

// ----------------------------------
// SAVE
// ----------------------------------
export function createAnnotationMap(req, res) {
  try {
    let { id, featureMapId, annotations } = req.body;

    if (!id) {
      id = crypto.randomUUID();
      req.body.id = id;
    }

    if (!featureMapId) {
      return res.status(400).json({
        error: "featureMapId required"
      });
    }

    if (!Array.isArray(annotations)) {
      return res.status(400).json({
        error: "annotations must be array"
      });
    }

    const overwrite = req.body.overwrite === true;

    const result = saveAnnotationMap(req.body, overwrite);

    return res.json({
      success: true,
      id: result.id
    });

  } catch (err) {
    console.error(err);

    if (err.code === 409) {
      return res.status(409).json({
        error: "Inspection already exists"
      });
    }

    return res.status(500).json({
      error: "Failed to save inspection"
    });
  }
}

// ----------------------------------
// LOAD ONE (by inspection id)
// ----------------------------------
export function getAnnotationMap(req, res) {
  try {
    const id = String(req.params.id).trim();

    const data = loadAnnotationMap(id);

    return res.json(data);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to load annotation"
    });
  }
}

// ----------------------------------
// LOAD BY FEATURE MAP
// ----------------------------------
export function getAnnotationsByFeatureMap(req, res) {
  try {
    const featureMapId = String(req.params.featureMapId).trim();

    const all = getAllAnnotationMaps();

    // ✅ Find a single matching annotation map
    const match = all.find(
      (a) => a.featureMapId === featureMapId
    );

    // ✅ If none found, return empty structure (NOT array)
    if (!match) {
      return res.json({
        featureMapId,
        annotations: []
      });
    }

    // ✅ Return the actual object
    return res.json(match);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to fetch annotations"
    });
  }
}

// ----------------------------------
// LOAD ALL
// ----------------------------------
export function fetchAnnotationMaps(req, res) {
  try {
    const data = getAllAnnotationMaps();
    return res.json(data);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to fetch annotation maps"
    });
  }
}