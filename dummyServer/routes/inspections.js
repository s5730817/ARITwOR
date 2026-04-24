import express from "express";
import { saveInspection } from "../controllers/inspectionsController.js";

const router = express.Router();

router.post("/", saveInspection);

export default router;