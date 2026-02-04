import express from "express";
import { authenticate } from "../middleware/auth.js";
import { proxyYandexOcr } from "../controllers/ocr.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/yandex", proxyYandexOcr);

export default router;
