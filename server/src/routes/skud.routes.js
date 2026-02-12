import express from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { authenticateSkudWebdel } from "../middleware/skudWebdelAuth.js";
import {
  allowCard,
  batchMutateSkudAccess,
  bindCard,
  blockSkudAccess,
  blockCard,
  deleteSkudAccess,
  getSkudAccessStates,
  getSkudCards,
  getSkudQrDenies,
  getSkudQrTokens,
  getSkudSettingsConfig,
  getSkudSyncJobs,
  getSkudEvents,
  getSkudStats,
  generateQr,
  grantSkudAccess,
  registerCard,
  revokeSkudAccess,
  resyncSkudEmployeeManually,
  checkSkudSettingsConfig,
  unbindCard,
  updateSkudSettingsConfig,
  validateQr,
  webdelDelegate,
  webdelEvents,
} from "../controllers/skud.controller.js";

const router = express.Router();

const accessMutationValidation = [
  body("employeeId").isUUID().withMessage("employeeId должен быть UUID"),
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("reason должен быть строкой до 1000 символов"),
  body("reasonCode")
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage("reasonCode должен быть строкой до 64 символов"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("metadata должен быть объектом"),
];

const listValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status")
    .optional()
    .isIn(["pending", "allowed", "blocked", "revoked", "deleted"]),
  query("employeeId").optional().isUUID(),
  query("q").optional().isString().isLength({ max: 255 }),
];

const eventsListValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("employeeId").optional().isUUID(),
  query("accessPoint").optional().isInt(),
  query("direction").optional().isInt(),
  query("allow").optional().isIn(["true", "false"]),
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
];

const cardsListValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status")
    .optional()
    .isIn(["active", "blocked", "unbound", "revoked", "lost"]),
  query("employeeId").optional().isUUID(),
  query("q").optional().isString().isLength({ max: 255 }),
];

const cardMutationSharedValidation = [
  body("cardId").optional().isUUID().withMessage("cardId должен быть UUID"),
  body("cardNumber")
    .optional()
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("cardNumber должен быть строкой до 128 символов"),
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("reason должен быть строкой до 1000 символов"),
  body("reasonCode")
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage("reasonCode должен быть строкой до 64 символов"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("metadata должен быть объектом"),
  body().custom((payload) => {
    if (!payload?.cardId && !payload?.cardNumber) {
      throw new Error("Требуется cardId или cardNumber");
    }
    return true;
  }),
];

const qrGenerateValidation = [
  body("employeeId").isUUID().withMessage("employeeId обязателен"),
  body("tokenType")
    .optional()
    .isIn(["persistent", "one_time"])
    .withMessage("tokenType должен быть persistent или one_time"),
  body("ttlSeconds")
    .optional()
    .isInt({ min: 1, max: 86400 })
    .withMessage("ttlSeconds должен быть числом от 1 до 86400"),
  body("metadata").optional().isObject(),
];

const qrValidateValidation = [
  body("token")
    .isString()
    .isLength({ min: 10 })
    .withMessage("token обязателен"),
  body("accessPoint").optional().isInt(),
  body("direction").optional().isInt({ min: 1, max: 3 }),
  body("metadata").optional().isObject(),
];

const qrListValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("employeeId").optional().isUUID(),
  query("status").optional().isIn(["active", "used", "expired", "revoked"]),
];

const syncJobsListValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 1000 }),
  query("employeeId").optional().isUUID(),
  query("status")
    .optional()
    .isIn(["pending", "processing", "success", "failed"]),
  query("operation").optional().isString().isLength({ max: 64 }),
];

const resyncValidation = [
  body("employeeId").isUUID().withMessage("employeeId обязателен"),
  body("reason").optional().isString().isLength({ max: 1000 }),
  body("metadata").optional().isObject(),
];

const settingsValidation = [
  body("webdelEnabled").optional().isBoolean(),
  body("webdelBaseUrl").optional().isString().isLength({ max: 500 }),
  body("webdelBasicUser").optional().isString().isLength({ max: 256 }),
  body("webdelBasicPassword").optional().isString().isLength({ max: 512 }),
  body("webdelIpAllowlist").optional().isString().isLength({ max: 4000 }),
  body("integrationMode").optional().isIn(["mock", "webdel", "sigur_rest"]),
  body("featureQrEnabled").optional().isBoolean(),
  body("featureCardsEnabled").optional().isBoolean(),
  body("featureSigurRestEnabled").optional().isBoolean(),
];

const webdelDelegateValidation = [
  body("type").optional().isString().isLength({ max: 32 }),
  body("keyHex").optional().isString().isLength({ max: 128 }),
  body("lpNumber").optional().isString().isLength({ max: 64 }),
  body("empid").optional().isString().isLength({ max: 128 }),
  body("direction").optional().isInt({ min: 1, max: 3 }),
  body("accessPoint").optional().isInt(),
  body().custom((payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Тело запроса должно быть объектом");
    }
    if (!payload.keyHex && !payload.lpNumber && !payload.empid) {
      throw new Error(
        "Требуется хотя бы один идентификатор: keyHex, lpNumber или empid",
      );
    }
    return true;
  }),
];

const webdelEventsValidation = [
  body("logs").isArray({ min: 1 }),
  body("logs.*.logId").optional().isInt(),
  body("logs.*.time").optional().isInt(),
  body("logs.*.empId").optional().isString().isLength({ max: 128 }),
  body("logs.*.internalEmpId").optional().isInt(),
  body("logs.*.accessPoint").optional().isInt(),
  body("logs.*.direction").optional().isInt({ min: 1, max: 3 }),
  body("logs.*.keyHex").optional().isString().isLength({ max: 128 }),
];

// External WebDel endpoints (no JWT auth)
router.post(
  "/webdel/delegate",
  authenticateSkudWebdel,
  webdelDelegateValidation,
  validate,
  webdelDelegate,
);
router.post(
  "/webdel/events",
  authenticateSkudWebdel,
  webdelEventsValidation,
  validate,
  webdelEvents,
);

// Internal staff endpoints
router.use(authenticate);
router.use(authorize("admin", "ot_admin", "ot_engineer"));

router.get("/access", listValidation, validate, getSkudAccessStates);
router.get("/events", eventsListValidation, validate, getSkudEvents);
router.get("/stats", validate, getSkudStats);
router.get("/cards", cardsListValidation, validate, getSkudCards);
router.get("/sync-jobs", syncJobsListValidation, validate, getSkudSyncJobs);
router.get("/settings", validate, getSkudSettingsConfig);
router.get("/qr/tokens", qrListValidation, validate, getSkudQrTokens);
router.get(
  "/qr/denies",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("employeeId").optional().isUUID(),
    query("dateFrom").optional().isISO8601(),
    query("dateTo").optional().isISO8601(),
  ],
  validate,
  getSkudQrDenies,
);
router.post("/qr/generate", qrGenerateValidation, validate, generateQr);
router.post("/qr/validate", qrValidateValidation, validate, validateQr);
router.post("/resync", resyncValidation, validate, resyncSkudEmployeeManually);
router.put("/settings", settingsValidation, validate, updateSkudSettingsConfig);
router.post(
  "/settings/check",
  settingsValidation,
  validate,
  checkSkudSettingsConfig,
);
router.post(
  "/access/grant",
  [
    ...accessMutationValidation,
    body("externalEmpId").optional().isString().isLength({ max: 128 }),
  ],
  validate,
  grantSkudAccess,
);
router.post(
  "/access/block",
  accessMutationValidation,
  validate,
  blockSkudAccess,
);
router.post(
  "/access/revoke",
  accessMutationValidation,
  validate,
  revokeSkudAccess,
);
router.post(
  "/access/batch",
  [
    body("action").isIn(["grant", "block", "revoke"]),
    body("employeeIds").isArray({ min: 1 }),
    body("employeeIds.*").isUUID(),
    body("reason").optional().isString().isLength({ max: 1000 }),
    body("reasonCode").optional().isString().isLength({ max: 64 }),
    body("metadata").optional().isObject(),
  ],
  validate,
  batchMutateSkudAccess,
);
router.delete(
  "/access/:employeeId",
  [
    param("employeeId").isUUID(),
    body("reason").optional().isString().isLength({ max: 1000 }),
    body("reasonCode").optional().isString().isLength({ max: 64 }),
    body("metadata").optional().isObject(),
  ],
  validate,
  deleteSkudAccess,
);
router.post(
  "/cards/register",
  [
    body("cardNumber")
      .isString()
      .isLength({ min: 1, max: 128 })
      .withMessage("cardNumber обязателен"),
    body("employeeId").optional().isUUID(),
    body("externalCardId").optional().isString().isLength({ max: 128 }),
    body("cardType").optional().isString().isLength({ max: 32 }),
    body("notes").optional().isString().isLength({ max: 2000 }),
    body("metadata").optional().isObject(),
  ],
  validate,
  registerCard,
);
router.post(
  "/cards/bind",
  [
    ...cardMutationSharedValidation,
    body("employeeId").isUUID().withMessage("employeeId обязателен"),
    body("notes").optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  bindCard,
);
router.post(
  "/cards/unbind",
  cardMutationSharedValidation,
  validate,
  unbindCard,
);
router.post("/cards/block", cardMutationSharedValidation, validate, blockCard);
router.post("/cards/allow", cardMutationSharedValidation, validate, allowCard);

export default router;
