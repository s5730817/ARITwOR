import express from "express";
import upload from "../config/multer.js";
import { handleUpload } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/upload", upload.array("images"), handleUpload);

export default router;