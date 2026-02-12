import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import upload, { fixFilenameEncoding } from "../middleware/upload.js";
import {
  recognizeDocumentFromImage,
  confirmRecognizedDocument,
} from "../controllers/ocr.controller.js";
import {
  listOcrMvdTestRuns,
  createOcrMvdTestRun,
  clearOcrMvdTestRuns,
} from "../controllers/ocrMvdTestRun.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/recognize",
  upload.single("file"),
  fixFilenameEncoding,
  recognizeDocumentFromImage,
);
router.post("/confirm", confirmRecognizedDocument);

// Debug OCR/MVD runs persistence (admin only)
router.get("/debug/runs", authorize("admin"), listOcrMvdTestRuns);
router.post("/debug/runs", authorize("admin"), createOcrMvdTestRun);
router.delete("/debug/runs", authorize("admin"), clearOcrMvdTestRuns);

export default router;
