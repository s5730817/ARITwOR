import express from "express";

import {
  createAnnotationMap,
  getAnnotationMap,
  fetchAnnotationMaps,
  getAnnotationsByFeatureMap
} from "../controllers/annotationsController.js";

const router = express.Router();

// Save annotations
router.post("/", createAnnotationMap);

// Get all annotation maps
router.get("/", fetchAnnotationMaps);

// 🔥 NEW (must be before :id)
router.get("/byFeatureMap/:featureMapId", getAnnotationsByFeatureMap);

// Get single annotation map by inspection id
router.get("/:id", getAnnotationMap);

export default router;