import { AppError } from "../middleware/errorHandler.js";
import { AuditLog } from "../models/index.js";
import {
  allowSkudCard,
  bindSkudCard,
  blockEmployeeAccess,
  blockSkudCard,
  generateSkudQrToken,
  grantEmployeeAccess,
  getAccessStats,
  listSkudCards,
  listAccessEvents,
  listSkudSyncJobs,
  listSkudQrDenies,
  listSkudQrTokens,
  ingestAccessEvents,
  listAccessStates,
  logDelegateDecision,
  registerSkudCard,
  resyncSkudEmployee,
  removeEmployeeAccess,
  resolveDelegateDecision,
  revokeEmployeeAccess,
  unbindSkudCard,
  validateSkudQrToken,
} from "../services/skudAccessService.js";
import { notifyTelegramAccessStatusChanged } from "../services/telegramService.js";
import {
  checkSkudSettingsConnection,
  getSkudSettings,
  getSkudSettingsMetaFields,
  updateSkudSettings,
} from "../services/skudSettingsService.js";

const mapState = (state) => ({
  id: state.id,
  employeeId: state.employeeId,
  externalSystem: state.externalSystem,
  status: state.status,
  statusReason: state.statusReason,
  reasonCode: state.reasonCode,
  source: state.source,
  effectiveFrom: state.effectiveFrom,
  effectiveTo: state.effectiveTo,
  changedBy: state.changedBy,
  metadata: state.metadata || {},
  createdAt: state.createdAt,
  updatedAt: state.updatedAt,
  employee: state.employee
    ? {
        id: state.employee.id,
        firstName: state.employee.firstName,
        lastName: state.employee.lastName,
        middleName: state.employee.middleName,
        isActive: state.employee.isActive,
      }
    : undefined,
});

const createSkudAuditLog = async (
  req,
  action,
  status,
  details = {},
  errorMessage = null,
  entityType = "skud_access",
) => {
  if (!req?.user?.id) return;

  try {
    await AuditLog.create({
      userId: req.user.id,
      action,
      entityType,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      status,
      errorMessage,
    });
  } catch (error) {
    console.error("Failed to write SKUD audit log:", error.message);
  }
};

const notifyTelegramStatusSafely = async (state) => {
  if (!state?.employeeId) return;

  try {
    await notifyTelegramAccessStatusChanged({
      employeeId: state.employeeId,
      status: state.status,
      statusReason: state.statusReason,
      reasonCode: state.reasonCode,
      eventKey: `state:${state.id}:${state.updatedAt?.toISOString?.() || Date.now()}`,
    });
  } catch (error) {
    console.error(
      "Failed to send Telegram status notification:",
      error.message,
    );
  }
};

const mapEvent = (event) => ({
  id: event.id,
  source: event.source,
  eventType: event.eventType,
  logId: event.logId,
  employeeId: event.employeeId,
  externalEmpId: event.externalEmpId,
  accessPoint: event.accessPoint,
  direction: event.direction,
  keyHex: event.keyHex,
  allow: event.allow,
  decisionMessage: event.decisionMessage,
  eventTime: event.eventTime,
  rawPayload: event.rawPayload,
  employee: event.employee
    ? {
        id: event.employee.id,
        firstName: event.employee.firstName,
        lastName: event.employee.lastName,
        middleName: event.employee.middleName,
      }
    : null,
});

const mapCard = (card) => ({
  id: card.id,
  employeeId: card.employeeId,
  externalSystem: card.externalSystem,
  externalCardId: card.externalCardId,
  cardNumber: card.cardNumber,
  cardNumberNormalized: card.cardNumberNormalized,
  cardType: card.cardType,
  status: card.status,
  issuedAt: card.issuedAt,
  blockedAt: card.blockedAt,
  lastSeenAt: card.lastSeenAt,
  notes: card.notes,
  metadata: card.metadata || {},
  createdAt: card.createdAt,
  updatedAt: card.updatedAt,
  employee: card.employee
    ? {
        id: card.employee.id,
        firstName: card.employee.firstName,
        lastName: card.employee.lastName,
        middleName: card.employee.middleName,
        isActive: card.employee.isActive,
      }
    : null,
});

const mapQrToken = (token) => ({
  id: token.id,
  employeeId: token.employeeId,
  externalSystem: token.externalSystem,
  jti: token.jti,
  tokenType: token.tokenType,
  status: token.status,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt,
  revokedAt: token.revokedAt,
  metadata: token.metadata || {},
  createdAt: token.createdAt,
  updatedAt: token.updatedAt,
  employee: token.employee
    ? {
        id: token.employee.id,
        firstName: token.employee.firstName,
        lastName: token.employee.lastName,
        middleName: token.employee.middleName,
        isActive: token.employee.isActive,
      }
    : null,
});

const mapSyncJob = (job) => ({
  id: job.id,
  externalSystem: job.externalSystem,
  employeeId: job.employeeId,
  operation: job.operation,
  status: job.status,
  payload: job.payload || {},
  responsePayload: job.responsePayload || null,
  errorMessage: job.errorMessage || null,
  attempts: job.attempts,
  processedAt: job.processedAt,
  createdBy: job.createdBy,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  employee: job.employee
    ? {
        id: job.employee.id,
        firstName: job.employee.firstName,
        lastName: job.employee.lastName,
        middleName: job.employee.middleName,
        isActive: job.employee.isActive,
      }
    : null,
});

export const getSkudAccessStates = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, employeeId, q } = req.query;
    const { items, pagination } = await listAccessStates({
      page,
      limit,
      status,
      employeeId,
      q,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapState),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const grantSkudAccess = async (req, res, next) => {
  try {
    const { employeeId, reason, reasonCode, externalEmpId, metadata } =
      req.body;

    const result = await grantEmployeeAccess({
      employeeId,
      reason,
      reasonCode,
      externalEmpId,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(req, "SKUD_ACCESS_GRANT", "success", {
      employeeId,
      reason,
      reasonCode,
      externalEmpId,
    });
    await notifyTelegramStatusSafely(result.state);

    res.status(201).json({
      success: true,
      message: "Доступ разрешен",
      data: {
        state: mapState(result.state),
        binding: result.binding,
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_GRANT",
      "failed",
      { employeeId: req.body?.employeeId },
      error.message,
    );
    next(error);
  }
};

export const blockSkudAccess = async (req, res, next) => {
  try {
    const { employeeId, reason, reasonCode, metadata } = req.body;
    const result = await blockEmployeeAccess({
      employeeId,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(req, "SKUD_ACCESS_BLOCK", "success", {
      employeeId,
      reason,
      reasonCode,
    });
    await notifyTelegramStatusSafely(result.state);

    res.json({
      success: true,
      message: "Доступ заблокирован",
      data: {
        state: mapState(result.state),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_BLOCK",
      "failed",
      { employeeId: req.body?.employeeId },
      error.message,
    );
    next(error);
  }
};

export const revokeSkudAccess = async (req, res, next) => {
  try {
    const { employeeId, reason, reasonCode, metadata } = req.body;
    const result = await revokeEmployeeAccess({
      employeeId,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(req, "SKUD_ACCESS_REVOKE", "success", {
      employeeId,
      reason,
      reasonCode,
    });
    await notifyTelegramStatusSafely(result.state);

    res.json({
      success: true,
      message: "Доступ отозван",
      data: {
        state: mapState(result.state),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_REVOKE",
      "failed",
      { employeeId: req.body?.employeeId },
      error.message,
    );
    next(error);
  }
};

export const deleteSkudAccess = async (req, res, next) => {
  try {
    if (!["admin", "ot_admin"].includes(req.user.role)) {
      throw new AppError("Недостаточно прав", 403);
    }

    const { employeeId } = req.params;
    const { reason, reasonCode, metadata } = req.body || {};

    const result = await removeEmployeeAccess({
      employeeId,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(req, "SKUD_ACCESS_DELETE", "success", {
      employeeId,
      reason,
      reasonCode,
    });
    await notifyTelegramStatusSafely(result.state);

    res.json({
      success: true,
      message: "Доступ деактивирован",
      data: {
        state: mapState(result.state),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_DELETE",
      "failed",
      { employeeId: req.params?.employeeId },
      error.message,
    );
    next(error);
  }
};

export const batchMutateSkudAccess = async (req, res, next) => {
  try {
    const { action, employeeIds, reason, reasonCode, metadata } = req.body;
    const userId = req.user.id;

    const results = [];
    for (const employeeId of employeeIds) {
      try {
        let result;
        if (action === "grant") {
          result = await grantEmployeeAccess({
            employeeId,
            reason,
            reasonCode,
            metadata,
            userId,
          });
        } else if (action === "block") {
          result = await blockEmployeeAccess({
            employeeId,
            reason,
            reasonCode,
            metadata,
            userId,
          });
        } else if (action === "revoke") {
          result = await revokeEmployeeAccess({
            employeeId,
            reason,
            reasonCode,
            metadata,
            userId,
          });
        } else {
          throw new AppError("Недопустимое действие batch", 400);
        }

        results.push({
          employeeId,
          success: true,
          state: mapState(result.state),
        });
        await notifyTelegramStatusSafely(result.state);
      } catch (error) {
        results.push({
          employeeId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_BATCH_MUTATE",
      failedCount > 0 ? (successCount > 0 ? "partial" : "failed") : "success",
      {
        action,
        total: results.length,
        successCount,
        failedCount,
      },
      failedCount > 0 ? "Часть операций завершилась ошибкой" : null,
    );

    res.json({
      success: true,
      data: {
        action,
        total: results.length,
        successCount,
        failedCount,
        results,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_ACCESS_BATCH_MUTATE",
      "failed",
      {
        action: req.body?.action,
        total: Array.isArray(req.body?.employeeIds)
          ? req.body.employeeIds.length
          : 0,
      },
      error.message,
    );
    next(error);
  }
};

export const getSkudEvents = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      employeeId,
      accessPoint,
      direction,
      allow,
      dateFrom,
      dateTo,
    } = req.query;

    const { items, pagination } = await listAccessEvents({
      page,
      limit,
      employeeId,
      accessPoint,
      direction,
      allow,
      dateFrom,
      dateTo,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapEvent),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSkudStats = async (req, res, next) => {
  try {
    const stats = await getAccessStats({
      dateFrom: req.query?.dateFrom,
      dateTo: req.query?.dateTo,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getSkudSyncJobs = async (req, res, next) => {
  try {
    const { page, limit, employeeId, status, operation } = req.query;
    const { items, pagination } = await listSkudSyncJobs({
      page,
      limit,
      employeeId,
      status,
      operation,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapSyncJob),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resyncSkudEmployeeManually = async (req, res, next) => {
  try {
    const { employeeId, reason, metadata } = req.body;
    const result = await resyncSkudEmployee({
      employeeId,
      reason,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_MANUAL_RESYNC",
      "success",
      {
        employeeId,
        reason,
      },
      null,
      "skud_sync",
    );

    res.status(201).json({
      success: true,
      message: "Resync поставлен в очередь",
      data: {
        syncJob: mapSyncJob(result.syncJob),
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_MANUAL_RESYNC",
      "failed",
      {
        employeeId: req.body?.employeeId || null,
      },
      error.message,
      "skud_sync",
    );
    next(error);
  }
};

export const getSkudCards = async (req, res, next) => {
  try {
    const { page, limit, status, employeeId, q } = req.query;
    const { items, pagination } = await listSkudCards({
      page,
      limit,
      status,
      employeeId,
      q,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapCard),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerCard = async (req, res, next) => {
  try {
    const {
      cardNumber,
      externalCardId,
      cardType,
      employeeId,
      notes,
      metadata,
    } = req.body;

    const result = await registerSkudCard({
      cardNumber,
      externalCardId,
      cardType,
      employeeId,
      notes,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_CARD_REGISTER",
      "success",
      {
        cardId: result.card.id,
        employeeId: result.card.employeeId,
      },
      null,
      "skud_card",
    );

    res.status(201).json({
      success: true,
      message: "Карта зарегистрирована",
      data: {
        card: mapCard(result.card),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_CARD_REGISTER",
      "failed",
      {
        cardNumber: req.body?.cardNumber || null,
      },
      error.message,
      "skud_card",
    );
    next(error);
  }
};

export const bindCard = async (req, res, next) => {
  try {
    const { cardId, cardNumber, employeeId, notes, metadata } = req.body;

    const result = await bindSkudCard({
      cardId,
      cardNumber,
      employeeId,
      notes,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_CARD_BIND",
      "success",
      {
        cardId: result.card.id,
        employeeId: result.card.employeeId,
      },
      null,
      "skud_card",
    );

    res.json({
      success: true,
      message: "Карта привязана",
      data: {
        card: mapCard(result.card),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_CARD_BIND",
      "failed",
      {
        cardId: req.body?.cardId || null,
        cardNumber: req.body?.cardNumber || null,
        employeeId: req.body?.employeeId || null,
      },
      error.message,
      "skud_card",
    );
    next(error);
  }
};

export const unbindCard = async (req, res, next) => {
  try {
    const { cardId, cardNumber, reason, reasonCode, metadata } = req.body;

    const result = await unbindSkudCard({
      cardId,
      cardNumber,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_CARD_UNBIND",
      "success",
      {
        cardId: result.card.id,
      },
      null,
      "skud_card",
    );

    res.json({
      success: true,
      message: "Карта отвязана",
      data: {
        card: mapCard(result.card),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_CARD_UNBIND",
      "failed",
      {
        cardId: req.body?.cardId || null,
        cardNumber: req.body?.cardNumber || null,
      },
      error.message,
      "skud_card",
    );
    next(error);
  }
};

export const blockCard = async (req, res, next) => {
  try {
    const { cardId, cardNumber, reason, reasonCode, metadata } = req.body;

    const result = await blockSkudCard({
      cardId,
      cardNumber,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_CARD_BLOCK",
      "success",
      {
        cardId: result.card.id,
      },
      null,
      "skud_card",
    );

    res.json({
      success: true,
      message: "Карта заблокирована",
      data: {
        card: mapCard(result.card),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_CARD_BLOCK",
      "failed",
      {
        cardId: req.body?.cardId || null,
        cardNumber: req.body?.cardNumber || null,
      },
      error.message,
      "skud_card",
    );
    next(error);
  }
};

export const allowCard = async (req, res, next) => {
  try {
    const { cardId, cardNumber, reason, reasonCode, metadata } = req.body;

    const result = await allowSkudCard({
      cardId,
      cardNumber,
      reason,
      reasonCode,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_CARD_ALLOW",
      "success",
      {
        cardId: result.card.id,
      },
      null,
      "skud_card",
    );

    res.json({
      success: true,
      message: "Карта разрешена",
      data: {
        card: mapCard(result.card),
        syncJob: result.syncJob,
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_CARD_ALLOW",
      "failed",
      {
        cardId: req.body?.cardId || null,
        cardNumber: req.body?.cardNumber || null,
      },
      error.message,
      "skud_card",
    );
    next(error);
  }
};

export const getSkudQrTokens = async (req, res, next) => {
  try {
    const { page, limit, employeeId, status } = req.query;
    const { items, pagination } = await listSkudQrTokens({
      page,
      limit,
      employeeId,
      status,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapQrToken),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSkudQrDenies = async (req, res, next) => {
  try {
    const { page, limit, employeeId, dateFrom, dateTo } = req.query;
    const { items, pagination } = await listSkudQrDenies({
      page,
      limit,
      employeeId,
      dateFrom,
      dateTo,
    });

    res.json({
      success: true,
      data: {
        items: items.map(mapEvent),
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const generateQr = async (req, res, next) => {
  try {
    const { employeeId, tokenType, ttlSeconds, metadata } = req.body;
    const result = await generateSkudQrToken({
      employeeId,
      tokenType,
      ttlSeconds,
      metadata,
      userId: req.user.id,
    });

    await createSkudAuditLog(
      req,
      "SKUD_QR_GENERATE",
      "success",
      {
        employeeId,
        tokenType: tokenType || "persistent",
        ttlSeconds: result.ttlSeconds,
      },
      null,
      "skud_qr",
    );

    res.status(201).json({
      success: true,
      message: "QR-код сформирован",
      data: {
        token: result.token,
        expiresAt: result.expiresAt,
        ttlSeconds: result.ttlSeconds,
        qrToken: mapQrToken({
          ...result.qrToken.toJSON(),
          status: "active",
        }),
      },
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_QR_GENERATE",
      "failed",
      { employeeId: req.body?.employeeId || null },
      error.message,
      "skud_qr",
    );
    next(error);
  }
};

export const validateQr = async (req, res, next) => {
  try {
    const { token, accessPoint, direction, metadata } = req.body;
    const decision = await validateSkudQrToken({
      token,
      accessPoint,
      direction,
      metadata,
    });

    res.json({
      success: true,
      data: {
        allow: decision.allow,
        message: decision.message,
        reasonCode: decision.reasonCode,
        employeeId: decision.employeeId,
        tokenType: decision.tokenType,
        expiresAt: decision.expiresAt,
        employee: decision.employee
          ? {
              id: decision.employee.id,
              firstName: decision.employee.firstName,
              lastName: decision.employee.lastName,
              middleName: decision.employee.middleName,
              isActive: decision.employee.isActive,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

const ensureSkudSettingsManageRole = (req) => {
  if (!["admin", "ot_admin"].includes(req.user?.role)) {
    throw new AppError("Недостаточно прав для изменения настроек СКУД", 403);
  }
};

export const getSkudSettingsConfig = async (req, res, next) => {
  try {
    const settings = await getSkudSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSkudSettingsConfig = async (req, res, next) => {
  try {
    ensureSkudSettingsManageRole(req);

    const patch = {};
    const allowedFields = new Set(getSkudSettingsMetaFields());
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (allowedFields.has(key)) {
        patch[key] = value;
      }
    });

    const settings = await updateSkudSettings(patch);
    await createSkudAuditLog(
      req,
      "SKUD_SETTINGS_UPDATE",
      "success",
      {
        updatedKeys: Object.keys(patch),
      },
      null,
      "skud_settings",
    );

    res.json({
      success: true,
      message: "Настройки СКУД обновлены",
      data: settings,
    });
  } catch (error) {
    await createSkudAuditLog(
      req,
      "SKUD_SETTINGS_UPDATE",
      "failed",
      {
        updatedKeys: Object.keys(req.body || {}),
      },
      error.message,
      "skud_settings",
    );
    next(error);
  }
};

export const checkSkudSettingsConfig = async (req, res, next) => {
  try {
    ensureSkudSettingsManageRole(req);

    const override = {};
    const allowedFields = new Set(getSkudSettingsMetaFields());
    Object.entries(req.body || {}).forEach(([key, value]) => {
      if (allowedFields.has(key)) {
        override[key] = value;
      }
    });

    const result = await checkSkudSettingsConnection(override);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const webdelDelegate = async (req, res, next) => {
  try {
    const decision = await resolveDelegateDecision(req.body);
    await logDelegateDecision({
      payload: req.body || {},
      decision,
    });

    res.json({
      allow: decision.allow,
      message: decision.allow ? undefined : decision.message,
    });
  } catch (error) {
    next(error);
  }
};

export const webdelEvents = async (req, res, next) => {
  try {
    const logs = req.body?.logs;
    const result = await ingestAccessEvents(logs);

    res.json({
      confirmedLogId: result.confirmedLogId,
    });
  } catch (error) {
    next(error);
  }
};
