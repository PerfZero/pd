import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  checkMvdRecord,
  getMvdMetadata,
} from "../controllers/mvd.controller.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin", "user", "manager"));

router.get("/meta", getMvdMetadata);
router.post("/check", checkMvdRecord);

export default router;
