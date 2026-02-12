import express from "express";
import { authenticate } from "../middleware/auth.js";
import upload, { fixFilenameEncoding } from "../middleware/upload.js";
import {
  getOtCategories,
  createOtCategory,
  updateOtCategory,
  deleteOtCategory,
  reorderOtCategory,
} from "../controllers/otCategory.controller.js";
import {
  getOtDocuments,
  createOtDocument,
  updateOtDocument,
  deleteOtDocument,
  uploadOtDocumentTemplate,
  downloadOtDocumentTemplate,
} from "../controllers/otDocument.controller.js";
import {
  getOtTemplates,
  createOtTemplate,
  deleteOtTemplate,
  downloadOtTemplateFile,
} from "../controllers/otTemplate.controller.js";
import {
  getOtInstructions,
  createOtInstruction,
  downloadOtInstructionFile,
} from "../controllers/otInstruction.controller.js";
import {
  getOtContractorDocuments,
  uploadOtContractorDocument,
  approveOtContractorDocument,
  rejectOtContractorDocument,
  downloadOtContractorDocumentFile,
  getOtContractorDocumentFileView,
  deleteOtContractorDocumentFile,
} from "../controllers/otContractorDocument.controller.js";
import {
  getOtContractorStatuses,
  getOtContractorStatusSummary,
  overrideOtContractorStatus,
  recalculateOtContractorStatus,
} from "../controllers/otContractorStatus.controller.js";
import {
  getOtComments,
  createOtComment,
  updateOtComment,
  deleteOtComment,
} from "../controllers/otComment.controller.js";

const router = express.Router();

router.use(authenticate);

// Categories
router.get("/categories", getOtCategories);
router.post("/categories", createOtCategory);
router.patch("/categories/:id", updateOtCategory);
router.delete("/categories/:id", deleteOtCategory);
router.patch("/categories/:id/order", reorderOtCategory);

// Documents
router.get("/documents", getOtDocuments);
router.post("/documents", createOtDocument);
router.patch("/documents/:id", updateOtDocument);
router.delete("/documents/:id", deleteOtDocument);
router.post(
  "/documents/:id/template",
  upload.single("file"),
  fixFilenameEncoding,
  uploadOtDocumentTemplate,
);
router.get("/documents/:id/template", downloadOtDocumentTemplate);

// Templates
router.get("/templates", getOtTemplates);
router.post(
  "/templates",
  upload.single("file"),
  fixFilenameEncoding,
  createOtTemplate,
);
router.delete("/templates/:id", deleteOtTemplate);
router.get("/templates/:id/file", downloadOtTemplateFile);

// Instructions
router.get("/instructions", getOtInstructions);
router.post(
  "/instructions",
  upload.single("file"),
  fixFilenameEncoding,
  createOtInstruction,
);
router.get("/instructions/:id/file", downloadOtInstructionFile);

// Contractor documents
router.get("/contractor-docs", getOtContractorDocuments);
router.post(
  "/contractor-docs",
  upload.single("file"),
  fixFilenameEncoding,
  uploadOtContractorDocument,
);
router.post("/contractor-docs/:id/approve", approveOtContractorDocument);
router.post("/contractor-docs/:id/reject", rejectOtContractorDocument);
router.get("/contractor-docs/:id/file", downloadOtContractorDocumentFile);
router.get(
  "/contractor-docs/:id/files/:fileId/view",
  getOtContractorDocumentFileView,
);
router.delete(
  "/contractor-docs/:id/files/:fileId",
  deleteOtContractorDocumentFile,
);

// Contractor statuses
router.get("/contractor-status", getOtContractorStatuses);
router.get("/contractor-status/summary", getOtContractorStatusSummary);
router.post(
  "/contractor-status/:counterpartyId/:siteId/override",
  overrideOtContractorStatus,
);
router.post(
  "/contractor-status/:counterpartyId/:siteId/recalculate",
  recalculateOtContractorStatus,
);

// Comments
router.get("/comments", getOtComments);
router.post("/comments", createOtComment);
router.patch("/comments/:id", updateOtComment);
router.delete("/comments/:id", deleteOtComment);

export default router;
