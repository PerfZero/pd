import express from "express";
import {
  getSettings,
  updateSetting,
  getPublicSettings,
} from "../controllers/settings.controller.js";
import {
  authenticate,
  authenticateWithoutActivationCheck,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// GET /api/v1/settings/public - получить публичные настройки (доступно всем авторизованным пользователям)
router.get("/public", authenticateWithoutActivationCheck, getPublicSettings);

// Все остальные маршруты доступны только администраторам
router.use(authenticate, authorize("admin"));

// GET /api/v1/settings - получить все настройки
router.get("/", getSettings);

// PUT /api/v1/settings/:key - обновить настройку по ключу
router.put("/:key", updateSetting);

export default router;
