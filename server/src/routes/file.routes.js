import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import upload, { fixFilenameEncoding } from "../middleware/upload.js";
import * as fileController from "../controllers/file.controller.js";

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);
router.use(authorize("admin", "user", "manager", "ot_admin", "ot_engineer"));

// Routes
router.post(
  "/upload",
  upload.single("file"),
  fixFilenameEncoding,
  fileController.uploadFile,
);
router.post(
  "/upload-multiple",
  upload.array("files", 5),
  fixFilenameEncoding,
  fileController.uploadMultipleFiles,
);
router.get("/id/:fileId", fileController.getFileById); // Получить файл по ID
router.get("/:fileKey", fileController.getFile); // Получить файл по ключу
router.get("/:fileKey/public", fileController.getPublicLink);
router.delete("/:fileKey", fileController.deleteFile);

export default router;
