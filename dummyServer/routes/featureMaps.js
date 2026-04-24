import express from "express";
import upload from "../config/multer.js";

import {
  fetchFeatureMaps,
  fetchFeatureMapById,
  createFeatureMap
} from "../controllers/featureMapsController.js";

const router = express.Router();

// -----------------------------
// CREATE Feature Map
// POST /api/featureMaps
// -----------------------------
router.post(
  "/",
  upload.array("images"),
  createFeatureMap
);

// -----------------------------
// GET all Feature Maps
// GET /api/featureMaps?type=vehicle
// -----------------------------
router.get("/", fetchFeatureMaps);

// -----------------------------
// GET Feature Map by ID
// GET /api/featureMaps/:id
// -----------------------------
router.get("/:id", fetchFeatureMapById);

export default router;