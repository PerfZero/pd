import { AppError } from "../middleware/errorHandler.js";
import { OcrMvdTestRun } from "../models/index.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const normalizeString = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeJsonObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 200);
};

const normalizeDate = (value) => {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toResponseRun = (run) => ({
  id: run.id,
  key: run.id,
  startedAt: run.startedAt,
  fileName: run.fileName,
  documentType: run.documentType,
  employeeId: run.employeeId,
  promptUsed: run.promptUsed,
  modelUsed: run.modelUsed,
  ocrStatus: run.ocrStatus,
  ocrMissingFields: Array.isArray(run.ocrMissingFields)
    ? run.ocrMissingFields
    : [],
  ocrNormalized: run.ocrNormalized || null,
  ocrRaw: run.ocrRaw || null,
  ocrError: run.ocrError,
  ocrProvider: run.ocrProvider,
  mvdType: run.mvdType,
  mvdStatus: run.mvdStatus,
  mvdParams: run.mvdParams || null,
  mvdMissingParams: Array.isArray(run.mvdMissingParams)
    ? run.mvdMissingParams
    : [],
  mvdResult: run.mvdResult || null,
  mvdError: run.mvdError,
  createdAt: run.createdAt,
});

export const listOcrMvdTestRuns = async (req, res, next) => {
  try {
    const limitRaw = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const runs = await OcrMvdTestRun.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit,
    });

    return res.json({
      success: true,
      data: {
        runs: runs.map(toResponseRun),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createOcrMvdTestRun = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const fileName = normalizeString(payload.fileName);
    const documentType = normalizeString(payload.documentType);

    if (!fileName) {
      throw new AppError("fileName обязателен", 400);
    }

    if (!documentType) {
      throw new AppError("documentType обязателен", 400);
    }

    const run = await OcrMvdTestRun.create({
      userId: req.user.id,
      employeeId: normalizeString(payload.employeeId),
      startedAt: normalizeDate(payload.startedAt),
      fileName,
      documentType,
      promptUsed: normalizeString(payload.promptUsed),
      modelUsed: normalizeString(payload.modelUsed),
      ocrStatus: normalizeString(payload.ocrStatus) || "error",
      ocrMissingFields: normalizeStringArray(payload.ocrMissingFields),
      ocrNormalized: normalizeJsonObject(payload.ocrNormalized),
      ocrRaw: normalizeJsonObject(payload.ocrRaw),
      ocrError: normalizeString(payload.ocrError),
      ocrProvider: normalizeString(payload.ocrProvider),
      mvdType: normalizeString(payload.mvdType),
      mvdStatus: normalizeString(payload.mvdStatus),
      mvdParams: normalizeJsonObject(payload.mvdParams),
      mvdMissingParams: normalizeStringArray(payload.mvdMissingParams),
      mvdResult: normalizeJsonObject(payload.mvdResult),
      mvdError: normalizeString(payload.mvdError),
    });

    return res.status(201).json({
      success: true,
      data: toResponseRun(run),
    });
  } catch (error) {
    next(error);
  }
};

export const clearOcrMvdTestRuns = async (req, res, next) => {
  try {
    const deletedCount = await OcrMvdTestRun.destroy({
      where: { userId: req.user.id },
    });

    return res.json({
      success: true,
      data: {
        deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
