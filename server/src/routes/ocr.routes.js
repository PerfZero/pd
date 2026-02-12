import express from "express";
import { authenticate } from "../middleware/auth.js";
import upload, { fixFilenameEncoding } from "../middleware/upload.js";
import {
  recognizeDocumentFromImage,
  confirmRecognizedDocument,
} from "../controllers/ocr.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/recognize",
  upload.single("file"),
  fixFilenameEncoding,
  recognizeDocumentFromImage,
);
router.post("/confirm", confirmRecognizedDocument);

export default router;
