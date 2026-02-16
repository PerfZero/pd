import express from "express";
import { query } from "express-validator";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import {
  exportAnalyticsByContractorExcel,
  exportAnalyticsByContractorPdf,
  exportAnalyticsBySiteExcel,
  exportAnalyticsEmployeeExcel,
  exportAnalyticsViolationsExcel,
  getAnalyticsByContractorReport,
  getAnalyticsBySiteReport,
  getAnalyticsDashboard,
  getAnalyticsEmployeeReport,
  getAnalyticsViolationsReport,
} from "../controllers/analytics.controller.js";

const router = express.Router();

const baseValidation = [
  query("dateFrom").optional().isISO8601(),
  query("dateTo").optional().isISO8601(),
  query("counterpartyId").optional().isString().isLength({ max: 64 }),
  query("constructionSiteId").optional().isString().isLength({ max: 64 }),
  query("employeeId").optional().isString().isLength({ max: 64 }),
  query("employeeSearch").optional().isString().isLength({ max: 255 }),
];

const listValidation = [
  ...baseValidation,
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 1000 }),
];

router.use(authenticate);
router.use(authorize("admin", "manager", "user", "ot_admin", "ot_engineer"));

router.get("/dashboard", baseValidation, validate, getAnalyticsDashboard);

router.get(
  "/reports/by-site",
  listValidation,
  validate,
  getAnalyticsBySiteReport,
);
router.get(
  "/reports/by-site/export/excel",
  baseValidation,
  validate,
  exportAnalyticsBySiteExcel,
);

router.get(
  "/reports/by-contractor",
  listValidation,
  validate,
  getAnalyticsByContractorReport,
);
router.get(
  "/reports/by-contractor/export/excel",
  baseValidation,
  validate,
  exportAnalyticsByContractorExcel,
);
router.get(
  "/reports/by-contractor/export/pdf",
  baseValidation,
  validate,
  exportAnalyticsByContractorPdf,
);

router.get(
  "/reports/employee",
  listValidation,
  validate,
  getAnalyticsEmployeeReport,
);
router.get(
  "/reports/employee/export/excel",
  baseValidation,
  validate,
  exportAnalyticsEmployeeExcel,
);

router.get(
  "/reports/violations",
  [
    ...listValidation,
    query("violationType").optional().isIn(["after_block", "without_pass", "other"]),
  ],
  validate,
  getAnalyticsViolationsReport,
);
router.get(
  "/reports/violations/export/excel",
  [
    ...baseValidation,
    query("violationType").optional().isIn(["after_block", "without_pass", "other"]),
  ],
  validate,
  exportAnalyticsViolationsExcel,
);

export default router;
