import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import {
  Employee,
  SkudAccessEvent,
  SkudAccessState,
  SkudCard,
  SkudPersonBinding,
  SkudQrToken,
  SkudSyncJob,
} from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";

const DEFAULT_EXTERNAL_SYSTEM = "sigur";
const ALLOWED_STATUS = new Set([
  "allowed",
  "blocked",
  "revoked",
  "deleted",
  "pending",
]);
const ALLOWED_CARD_STATUS = new Set([
  "active",
  "blocked",
  "unbound",
  "revoked",
  "lost",
]);
const ALLOWED_QR_TOKEN_TYPE = new Set(["persistent", "one_time"]);
const ALLOWED_SYNC_STATUS = new Set([
  "pending",
  "processing",
  "success",
  "failed",
]);
const SYSTEM_BLOCK_REASONS = new Set(["rkl", "document_expired"]);
const QR_TOKEN_PURPOSE = "skud_qr_access";
const QR_TOKEN_ISSUER = "passdesk-skud-qr";
const DEFAULT_QR_TTL_SECONDS = 5 * 60;
const MAX_QR_TTL_SECONDS = 24 * 60 * 60;

const normalizeCardNumber = (value) => {
  if (!value || typeof value !== "string") return null;
  return value.replace(/\s+/g, "").toUpperCase();
};

const toDateFromUnixSeconds = (value) => {
  if (value === null || value === undefined) return new Date();
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return new Date();
  return new Date(parsed * 1000);
};

const getSkudQrJwtSecret = () => {
  const secret = process.env.SKUD_QR_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "SKUD_QR_JWT_SECRET или JWT_SECRET должен быть настроен",
      500,
    );
  }
  return secret;
};

const normalizeQrTtlSeconds = (value) => {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_QR_TTL_SECONDS;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(
      "ttlSeconds должен быть положительным целым числом",
      400,
    );
  }
  if (parsed > MAX_QR_TTL_SECONDS) {
    throw new AppError(
      `ttlSeconds не может быть больше ${MAX_QR_TTL_SECONDS}`,
      400,
    );
  }
  return parsed;
};

const hashQrToken = (token) =>
  crypto.createHash("sha256").update(String(token), "utf8").digest("hex");

const getQrTokenStatus = (qrToken) => {
  if (!qrToken) return "unknown";
  if (qrToken.revokedAt) return "revoked";
  if (qrToken.tokenType === "one_time" && qrToken.usedAt) return "used";
  if (new Date(qrToken.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
};

const resolveCardWhere = ({ cardId, cardNumber }) => {
  if (cardId) {
    return {
      id: cardId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    };
  }

  const normalized = normalizeCardNumber(cardNumber);
  if (!normalized) {
    throw new AppError(
      "Требуется cardId или cardNumber для операции с картой",
      400,
    );
  }

  return {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    cardNumberNormalized: normalized,
  };
};

const ensureCardExists = async ({ cardId, cardNumber }) => {
  const card = await SkudCard.findOne({
    where: resolveCardWhere({ cardId, cardNumber }),
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
      },
    ],
  });

  if (!card) {
    throw new AppError("Карта не найдена", 404);
  }

  return card;
};

const ensureEmployeeExists = async (employeeId) => {
  const employee = await Employee.findOne({
    where: {
      id: employeeId,
      isDeleted: false,
    },
    attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
  });

  if (!employee) {
    throw new AppError("Сотрудник не найден", 404);
  }

  return employee;
};

const upsertBinding = async ({
  employeeId,
  externalEmpId,
  changedBy,
  metadata,
}) => {
  if (!externalEmpId) return null;

  const binding = await SkudPersonBinding.findOne({
    where: {
      employeeId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    },
  });

  if (binding) {
    await binding.update({
      externalEmpId: String(externalEmpId),
      isActive: true,
      updatedBy: changedBy || null,
      metadata: metadata || binding.metadata || {},
    });
    return binding;
  }

  return SkudPersonBinding.create({
    employeeId,
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    externalEmpId: String(externalEmpId),
    source: "manual",
    isActive: true,
    metadata: metadata || {},
    createdBy: changedBy || null,
    updatedBy: changedBy || null,
  });
};

const createSyncJob = async ({ employeeId, operation, payload, userId }) => {
  return SkudSyncJob.create({
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    employeeId,
    operation,
    status: "pending",
    payload,
    attempts: 0,
    createdBy: userId || null,
  });
};

const ensureNoSystemBlockConflict = async (existingState, nextStatus) => {
  if (!existingState) return;
  if (nextStatus !== "allowed") return;
  if (existingState.status !== "blocked") return;
  if (!SYSTEM_BLOCK_REASONS.has(existingState.reasonCode)) return;

  throw new AppError(
    "Сотрудник заблокирован системным правилом (РКЛ/истекший документ). Сначала устраните причину блокировки.",
    409,
  );
};

const upsertAccessState = async ({
  employeeId,
  status,
  statusReason = null,
  reasonCode = null,
  source = "manual",
  changedBy = null,
  metadata = {},
}) => {
  if (!ALLOWED_STATUS.has(status)) {
    throw new AppError("Недопустимый статус доступа", 400);
  }

  const current = await SkudAccessState.findOne({
    where: {
      employeeId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    },
  });

  await ensureNoSystemBlockConflict(current, status);

  if (!current) {
    return SkudAccessState.create({
      employeeId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      status,
      statusReason,
      reasonCode,
      source,
      effectiveFrom: new Date(),
      changedBy,
      metadata,
    });
  }

  return current.update({
    status,
    statusReason,
    reasonCode,
    source,
    effectiveTo: null,
    changedBy,
    metadata:
      metadata && Object.keys(metadata).length
        ? metadata
        : current.metadata || {},
  });
};

export const grantEmployeeAccess = async ({
  employeeId,
  reason = "Разрешено вручную",
  reasonCode = "manual_allow",
  externalEmpId = null,
  metadata = {},
  userId,
}) => {
  await ensureEmployeeExists(employeeId);

  const state = await upsertAccessState({
    employeeId,
    status: "allowed",
    statusReason: reason,
    reasonCode,
    source: "manual",
    changedBy: userId,
    metadata,
  });

  const [binding, syncJob] = await Promise.all([
    upsertBinding({ employeeId, externalEmpId, changedBy: userId, metadata }),
    createSyncJob({
      employeeId,
      operation: "grant_access",
      payload: { reason, reasonCode, externalEmpId, metadata },
      userId,
    }),
  ]);

  return { state, binding, syncJob };
};

export const blockEmployeeAccess = async ({
  employeeId,
  reason = "Заблокировано вручную",
  reasonCode = "manual_block",
  metadata = {},
  userId,
}) => {
  await ensureEmployeeExists(employeeId);

  const state = await upsertAccessState({
    employeeId,
    status: "blocked",
    statusReason: reason,
    reasonCode,
    source: "manual",
    changedBy: userId,
    metadata,
  });

  const syncJob = await createSyncJob({
    employeeId,
    operation: "block_access",
    payload: { reason, reasonCode, metadata },
    userId,
  });

  return { state, syncJob };
};

export const revokeEmployeeAccess = async ({
  employeeId,
  reason = "Доступ отозван",
  reasonCode = "manual_revoke",
  metadata = {},
  userId,
}) => {
  await ensureEmployeeExists(employeeId);

  const state = await upsertAccessState({
    employeeId,
    status: "revoked",
    statusReason: reason,
    reasonCode,
    source: "manual",
    changedBy: userId,
    metadata,
  });

  const syncJob = await createSyncJob({
    employeeId,
    operation: "revoke_access",
    payload: { reason, reasonCode, metadata },
    userId,
  });

  return { state, syncJob };
};

export const removeEmployeeAccess = async ({
  employeeId,
  reason = "Доступ деактивирован",
  reasonCode = "manual_delete",
  metadata = {},
  userId,
}) => {
  await ensureEmployeeExists(employeeId);

  const [state] = await Promise.all([
    upsertAccessState({
      employeeId,
      status: "deleted",
      statusReason: reason,
      reasonCode,
      source: "manual",
      changedBy: userId,
      metadata,
    }),
    SkudPersonBinding.update(
      {
        isActive: false,
        updatedBy: userId || null,
      },
      {
        where: {
          employeeId,
          externalSystem: DEFAULT_EXTERNAL_SYSTEM,
        },
      },
    ),
  ]);

  const syncJob = await createSyncJob({
    employeeId,
    operation: "remove_access",
    payload: { reason, reasonCode, metadata },
    userId,
  });

  return { state, syncJob };
};

export const listAccessStates = async ({
  page = 1,
  limit = 20,
  status,
  employeeId,
  q,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };

  if (status) {
    where.status = status;
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  const employeeWhere = {
    isDeleted: false,
  };
  if (q && String(q).trim()) {
    const pattern = `%${String(q).trim()}%`;
    employeeWhere[Op.or] = [
      { firstName: { [Op.iLike]: pattern } },
      { lastName: { [Op.iLike]: pattern } },
      { middleName: { [Op.iLike]: pattern } },
    ];
  }

  const { rows, count } = await SkudAccessState.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
        where: employeeWhere,
      },
    ],
    order: [["updatedAt", "DESC"]],
    limit: safeLimit,
    offset,
  });

  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const listAccessEvents = async ({
  page = 1,
  limit = 20,
  employeeId,
  accessPoint,
  direction,
  allow,
  dateFrom,
  dateTo,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };

  if (employeeId) where.employeeId = employeeId;
  if (accessPoint !== undefined && accessPoint !== null && accessPoint !== "") {
    where.accessPoint = Number(accessPoint);
  }
  if (direction !== undefined && direction !== null && direction !== "") {
    where.direction = Number(direction);
  }
  if (allow !== undefined && allow !== null && allow !== "") {
    if (allow === "true" || allow === true) where.allow = true;
    if (allow === "false" || allow === false) where.allow = false;
  }

  if (dateFrom || dateTo) {
    where.eventTime = {};
    if (dateFrom) {
      where.eventTime[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      where.eventTime[Op.lte] = new Date(dateTo);
    }
  }

  const { rows, count } = await SkudAccessEvent.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName"],
      },
    ],
    order: [
      ["eventTime", "DESC"],
      ["id", "DESC"],
    ],
    limit: safeLimit,
    offset,
  });

  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const getAccessStats = async ({ dateFrom, dateTo } = {}) => {
  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };

  if (dateFrom || dateTo) {
    where.eventTime = {};
    if (dateFrom) where.eventTime[Op.gte] = new Date(dateFrom);
    if (dateTo) where.eventTime[Op.lte] = new Date(dateTo);
  }

  const [allowCount, denyCount, totalEvents, stateCounts] = await Promise.all([
    SkudAccessEvent.count({
      where: {
        ...where,
        allow: true,
      },
    }),
    SkudAccessEvent.count({
      where: {
        ...where,
        allow: false,
      },
    }),
    SkudAccessEvent.count({ where }),
    SkudAccessState.findAll({
      where: { externalSystem: DEFAULT_EXTERNAL_SYSTEM },
      attributes: [
        "status",
        [SkudAccessState.sequelize.fn("COUNT", "*"), "count"],
      ],
      group: ["status"],
      raw: true,
    }),
  ]);

  const byStatus = {
    pending: 0,
    allowed: 0,
    blocked: 0,
    revoked: 0,
    deleted: 0,
  };
  stateCounts.forEach((row) => {
    const status = row.status;
    if (status in byStatus) {
      byStatus[status] = Number(row.count) || 0;
    }
  });

  return {
    events: {
      total: totalEvents,
      allow: allowCount,
      deny: denyCount,
    },
    accessStates: byStatus,
  };
};

export const listSkudSyncJobs = async ({
  page = 1,
  limit = 20,
  employeeId,
  status,
  operation,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };
  if (employeeId) {
    where.employeeId = employeeId;
  }
  if (status) {
    if (!ALLOWED_SYNC_STATUS.has(status)) {
      throw new AppError("Недопустимый статус sync-job", 400);
    }
    where.status = status;
  }
  if (operation) {
    where.operation = String(operation);
  }

  const { rows, count } = await SkudSyncJob.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
        where: {
          isDeleted: false,
        },
      },
    ],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit: safeLimit,
    offset,
  });

  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const resyncSkudEmployee = async ({
  employeeId,
  reason = "Ручной resync из UI",
  metadata = {},
  userId,
}) => {
  const employee = await ensureEmployeeExists(employeeId);

  const [state, binding, activeCardsCount] = await Promise.all([
    SkudAccessState.findOne({
      where: {
        employeeId,
        externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      },
      attributes: ["status", "reasonCode", "statusReason", "updatedAt"],
    }),
    SkudPersonBinding.findOne({
      where: {
        employeeId,
        externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      },
      attributes: ["externalEmpId", "isActive", "updatedAt"],
    }),
    SkudCard.count({
      where: {
        employeeId,
        externalSystem: DEFAULT_EXTERNAL_SYSTEM,
        status: "active",
      },
    }),
  ]);

  const syncJob = await createSyncJob({
    employeeId,
    operation: "manual_resync",
    payload: {
      reason,
      metadata: metadata || {},
      snapshot: {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          middleName: employee.middleName,
          isActive: employee.isActive,
        },
        accessState: state
          ? {
              status: state.status,
              reasonCode: state.reasonCode,
              statusReason: state.statusReason,
              updatedAt: state.updatedAt,
            }
          : null,
        binding: binding
          ? {
              externalEmpId: binding.externalEmpId,
              isActive: binding.isActive,
              updatedAt: binding.updatedAt,
            }
          : null,
        activeCardsCount,
      },
    },
    userId,
  });

  return { syncJob };
};

export const listSkudCards = async ({
  page = 1,
  limit = 20,
  status,
  employeeId,
  q,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };

  if (status) {
    if (!ALLOWED_CARD_STATUS.has(status)) {
      throw new AppError("Недопустимый статус карты", 400);
    }
    where.status = status;
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (q && String(q).trim()) {
    const pattern = `%${String(q).trim()}%`;
    where[Op.or] = [
      { cardNumber: { [Op.iLike]: pattern } },
      { externalCardId: { [Op.iLike]: pattern } },
    ];
  }

  const { rows, count } = await SkudCard.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
        where: {
          isDeleted: false,
        },
      },
    ],
    order: [["updatedAt", "DESC"]],
    limit: safeLimit,
    offset,
  });

  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const registerSkudCard = async ({
  cardNumber,
  externalCardId = null,
  cardType = "rfid",
  employeeId = null,
  notes = null,
  metadata = {},
  userId,
}) => {
  const normalized = normalizeCardNumber(cardNumber);
  if (!normalized) {
    throw new AppError("cardNumber обязателен", 400);
  }

  if (employeeId) {
    await ensureEmployeeExists(employeeId);
  }

  const existing = await SkudCard.findOne({
    where: {
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      cardNumberNormalized: normalized,
    },
  });

  if (existing) {
    throw new AppError("Карта с таким номером уже зарегистрирована", 409);
  }

  const card = await SkudCard.create({
    employeeId,
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    externalCardId: externalCardId ? String(externalCardId) : null,
    cardNumber: String(cardNumber).trim(),
    cardNumberNormalized: normalized,
    cardType: cardType || "rfid",
    status: employeeId ? "active" : "unbound",
    issuedAt: new Date(),
    notes,
    metadata: metadata || {},
    createdBy: userId || null,
    updatedBy: userId || null,
  });

  const syncJob = await createSyncJob({
    employeeId: employeeId || null,
    operation: "register_card",
    payload: {
      cardId: card.id,
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      externalCardId: card.externalCardId,
      employeeId,
      metadata: metadata || {},
    },
    userId,
  });

  const cardWithEmployee = await ensureCardExists({ cardId: card.id });
  return { card: cardWithEmployee, syncJob };
};

export const bindSkudCard = async ({
  cardId = null,
  cardNumber = null,
  employeeId,
  notes = null,
  metadata = {},
  userId,
}) => {
  if (!employeeId) {
    throw new AppError("employeeId обязателен", 400);
  }

  await ensureEmployeeExists(employeeId);
  const card = await ensureCardExists({ cardId, cardNumber });

  if (["revoked", "lost"].includes(card.status)) {
    throw new AppError(
      "Нельзя привязать карту со статусом revoked/lost. Зарегистрируйте новую карту.",
      409,
    );
  }

  const updated = await card.update({
    employeeId,
    status: "active",
    blockedAt: null,
    notes: notes ?? card.notes,
    metadata:
      metadata && Object.keys(metadata).length ? metadata : card.metadata || {},
    updatedBy: userId || null,
  });

  const syncJob = await createSyncJob({
    employeeId,
    operation: "bind_card",
    payload: {
      cardId: updated.id,
      cardNumber: updated.cardNumber,
      employeeId,
      metadata: metadata || {},
    },
    userId,
  });

  const cardWithEmployee = await ensureCardExists({ cardId: updated.id });
  return { card: cardWithEmployee, syncJob };
};

export const unbindSkudCard = async ({
  cardId = null,
  cardNumber = null,
  reason = "Карта отвязана вручную",
  reasonCode = "manual_unbind",
  metadata = {},
  userId,
}) => {
  const card = await ensureCardExists({ cardId, cardNumber });

  const nextStatus =
    card.status === "revoked" || card.status === "lost"
      ? card.status
      : "unbound";

  const updated = await card.update({
    employeeId: null,
    status: nextStatus,
    notes: reason || card.notes,
    metadata: {
      ...(card.metadata || {}),
      ...(metadata || {}),
      unbindReason: reason,
      reasonCode,
    },
    updatedBy: userId || null,
  });

  const syncJob = await createSyncJob({
    employeeId: null,
    operation: "unbind_card",
    payload: {
      cardId: updated.id,
      cardNumber: updated.cardNumber,
      reason,
      reasonCode,
      metadata: metadata || {},
    },
    userId,
  });

  const cardWithEmployee = await ensureCardExists({ cardId: updated.id });
  return { card: cardWithEmployee, syncJob };
};

export const blockSkudCard = async ({
  cardId = null,
  cardNumber = null,
  reason = "Карта заблокирована вручную",
  reasonCode = "manual_card_block",
  metadata = {},
  userId,
}) => {
  const card = await ensureCardExists({ cardId, cardNumber });

  const updated = await card.update({
    status: "blocked",
    blockedAt: new Date(),
    notes: reason || card.notes,
    metadata: {
      ...(card.metadata || {}),
      ...(metadata || {}),
      blockReason: reason,
      reasonCode,
    },
    updatedBy: userId || null,
  });

  const syncJob = await createSyncJob({
    employeeId: updated.employeeId || null,
    operation: "block_card",
    payload: {
      cardId: updated.id,
      cardNumber: updated.cardNumber,
      reason,
      reasonCode,
      metadata: metadata || {},
    },
    userId,
  });

  const cardWithEmployee = await ensureCardExists({ cardId: updated.id });
  return { card: cardWithEmployee, syncJob };
};

export const allowSkudCard = async ({
  cardId = null,
  cardNumber = null,
  reason = "Карта разрешена вручную",
  reasonCode = "manual_card_allow",
  metadata = {},
  userId,
}) => {
  const card = await ensureCardExists({ cardId, cardNumber });

  if (["revoked", "lost"].includes(card.status)) {
    throw new AppError(
      "Нельзя разрешить карту со статусом revoked/lost. Зарегистрируйте новую карту.",
      409,
    );
  }

  const nextStatus = card.employeeId ? "active" : "unbound";
  const updated = await card.update({
    status: nextStatus,
    blockedAt: null,
    notes: reason || card.notes,
    metadata: {
      ...(card.metadata || {}),
      ...(metadata || {}),
      allowReason: reason,
      reasonCode,
    },
    updatedBy: userId || null,
  });

  const syncJob = await createSyncJob({
    employeeId: updated.employeeId || null,
    operation: "allow_card",
    payload: {
      cardId: updated.id,
      cardNumber: updated.cardNumber,
      reason,
      reasonCode,
      metadata: metadata || {},
    },
    userId,
  });

  const cardWithEmployee = await ensureCardExists({ cardId: updated.id });
  return { card: cardWithEmployee, syncJob };
};

const resolveQrValidationDecision = async ({
  token,
  accessPoint,
  direction,
}) => {
  const now = new Date();
  const tokenHash = hashQrToken(token);
  const qrToken = await SkudQrToken.findOne({
    where: {
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      tokenHash,
    },
  });

  let jwtPayload = null;
  try {
    jwtPayload = jwt.verify(token, getSkudQrJwtSecret(), {
      issuer: QR_TOKEN_ISSUER,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return {
        allow: false,
        message: "QR-код истек",
        reasonCode: "qr_expired",
        employeeId: qrToken?.employeeId || null,
        qrToken,
        tokenType: qrToken?.tokenType || null,
        expiresAt: qrToken?.expiresAt || null,
        accessPoint,
        direction,
      };
    }

    return {
      allow: false,
      message: "Невалидный QR-код",
      reasonCode: "qr_invalid",
      employeeId: qrToken?.employeeId || null,
      qrToken,
      tokenType: qrToken?.tokenType || null,
      expiresAt: qrToken?.expiresAt || null,
      accessPoint,
      direction,
    };
  }

  if (!jwtPayload || jwtPayload.purpose !== QR_TOKEN_PURPOSE) {
    return {
      allow: false,
      message: "Невалидный QR-код",
      reasonCode: "qr_invalid",
      employeeId: qrToken?.employeeId || null,
      qrToken,
      tokenType: qrToken?.tokenType || null,
      expiresAt: qrToken?.expiresAt || null,
      accessPoint,
      direction,
    };
  }

  if (!qrToken) {
    return {
      allow: false,
      message: "QR-код не найден",
      reasonCode: "qr_not_found",
      employeeId: jwtPayload.employeeId || null,
      qrToken: null,
      tokenType: jwtPayload.tokenType || null,
      expiresAt: jwtPayload.exp ? new Date(jwtPayload.exp * 1000) : null,
      accessPoint,
      direction,
    };
  }

  if (qrToken.revokedAt) {
    return {
      allow: false,
      message: "QR-код отозван",
      reasonCode: "qr_revoked",
      employeeId: qrToken.employeeId,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  if (new Date(qrToken.expiresAt).getTime() <= Date.now()) {
    return {
      allow: false,
      message: "QR-код истек",
      reasonCode: "qr_expired",
      employeeId: qrToken.employeeId,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  if (qrToken.tokenType === "one_time" && qrToken.usedAt) {
    return {
      allow: false,
      message: "QR-код уже использован",
      reasonCode: "qr_used",
      employeeId: qrToken.employeeId,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  const employee = await Employee.findOne({
    where: {
      id: qrToken.employeeId,
      isDeleted: false,
    },
    attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
  });

  if (!employee) {
    return {
      allow: false,
      message: "Сотрудник не найден",
      reasonCode: "employee_not_found",
      employeeId: qrToken.employeeId,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  if (!employee.isActive) {
    return {
      allow: false,
      message: "Сотрудник не активен",
      reasonCode: "employee_inactive",
      employeeId: qrToken.employeeId,
      employee,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  const state = await SkudAccessState.findOne({
    where: {
      employeeId: qrToken.employeeId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    },
  });

  if (!state) {
    return {
      allow: false,
      message: "Нет активного допуска",
      reasonCode: "state_missing",
      employeeId: qrToken.employeeId,
      employee,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  if (state.status !== "allowed") {
    return {
      allow: false,
      message: state.statusReason || "Доступ запрещен",
      reasonCode: state.reasonCode || `state_${state.status}`,
      employeeId: qrToken.employeeId,
      employee,
      qrToken,
      tokenType: qrToken.tokenType,
      expiresAt: qrToken.expiresAt,
      accessPoint,
      direction,
    };
  }

  if (qrToken.tokenType === "one_time") {
    await qrToken.update({
      usedAt: now,
    });
  }

  return {
    allow: true,
    message: "",
    reasonCode: "allowed",
    employeeId: qrToken.employeeId,
    employee,
    qrToken,
    tokenType: qrToken.tokenType,
    expiresAt: qrToken.expiresAt,
    accessPoint,
    direction,
  };
};

const logQrValidationDecision = async ({
  token,
  decision,
  accessPoint = null,
  direction = null,
  metadata = {},
}) => {
  await SkudAccessEvent.create({
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    source: "qr",
    eventType: "qr_validate",
    employeeId: decision.employeeId || null,
    accessPoint: accessPoint ?? null,
    direction: direction ?? null,
    allow: decision.allow,
    decisionMessage: decision.message || null,
    eventTime: new Date(),
    rawPayload: {
      reasonCode: decision.reasonCode,
      tokenType: decision.tokenType || null,
      expiresAt: decision.expiresAt || null,
      tokenHash: hashQrToken(token),
      metadata: metadata || {},
    },
  });
};

export const listSkudQrTokens = async ({
  page = 1,
  limit = 20,
  employeeId,
  status,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
  };
  if (employeeId) {
    where.employeeId = employeeId;
  }
  if (status) {
    const now = new Date();
    if (status === "active") {
      where[Op.and] = [
        { revokedAt: null },
        {
          [Op.or]: [{ tokenType: "persistent" }, { usedAt: null }],
        },
        { expiresAt: { [Op.gt]: now } },
      ];
    } else if (status === "used") {
      where[Op.and] = [
        { tokenType: "one_time" },
        { usedAt: { [Op.not]: null } },
      ];
    } else if (status === "expired") {
      where[Op.and] = [{ revokedAt: null }, { expiresAt: { [Op.lte]: now } }];
    } else if (status === "revoked") {
      where.revokedAt = { [Op.not]: null };
    } else {
      throw new AppError("Недопустимый статус QR", 400);
    }
  }

  const { rows, count } = await SkudQrToken.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
        where: {
          isDeleted: false,
        },
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
  });

  const items = rows.map((item) => ({
    ...item.toJSON(),
    status: getQrTokenStatus(item),
  }));

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const listSkudQrDenies = async ({
  page = 1,
  limit = 20,
  employeeId,
  dateFrom,
  dateTo,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    source: "qr",
    eventType: "qr_validate",
    allow: false,
  };

  if (employeeId) where.employeeId = employeeId;
  if (dateFrom || dateTo) {
    where.eventTime = {};
    if (dateFrom) where.eventTime[Op.gte] = new Date(dateFrom);
    if (dateTo) where.eventTime[Op.lte] = new Date(dateTo);
  }

  const { rows, count } = await SkudAccessEvent.findAndCountAll({
    where,
    include: [
      {
        model: Employee,
        as: "employee",
        required: false,
        attributes: ["id", "firstName", "lastName", "middleName", "isActive"],
      },
    ],
    order: [
      ["eventTime", "DESC"],
      ["id", "DESC"],
    ],
    limit: safeLimit,
    offset,
  });

  return {
    items: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      pages: Math.ceil(count / safeLimit),
    },
  };
};

export const generateSkudQrToken = async ({
  employeeId,
  tokenType = "persistent",
  ttlSeconds,
  metadata = {},
  userId,
}) => {
  if (!employeeId) {
    throw new AppError("employeeId обязателен", 400);
  }
  if (!ALLOWED_QR_TOKEN_TYPE.has(tokenType)) {
    throw new AppError("Недопустимый tokenType", 400);
  }

  await ensureEmployeeExists(employeeId);

  const safeTtlSeconds = normalizeQrTtlSeconds(ttlSeconds);
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      purpose: QR_TOKEN_PURPOSE,
      employeeId,
      tokenType,
      jti,
    },
    getSkudQrJwtSecret(),
    {
      expiresIn: safeTtlSeconds,
      issuer: QR_TOKEN_ISSUER,
      subject: String(employeeId),
    },
  );

  const expiresAt = new Date(Date.now() + safeTtlSeconds * 1000);
  const qrToken = await SkudQrToken.create({
    employeeId,
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    jti,
    tokenHash: hashQrToken(token),
    tokenType,
    expiresAt,
    issuedBy: userId || null,
    metadata: metadata || {},
  });

  return {
    token,
    ttlSeconds: safeTtlSeconds,
    expiresAt,
    qrToken,
  };
};

export const validateSkudQrToken = async ({
  token,
  accessPoint = null,
  direction = null,
  metadata = {},
}) => {
  if (!token || typeof token !== "string") {
    throw new AppError("token обязателен", 400);
  }

  const decision = await resolveQrValidationDecision({
    token,
    accessPoint,
    direction,
  });

  await logQrValidationDecision({
    token,
    decision,
    accessPoint,
    direction,
    metadata,
  });

  return decision;
};

const resolveEmployeeByPayload = async (payload) => {
  const externalEmpId = payload?.empid ? String(payload.empid) : null;
  if (externalEmpId) {
    const binding = await SkudPersonBinding.findOne({
      where: {
        externalSystem: DEFAULT_EXTERNAL_SYSTEM,
        externalEmpId,
        isActive: true,
      },
    });

    if (binding) {
      return {
        employeeId: binding.employeeId,
        externalEmpId,
        matchedBy: "externalEmpId",
      };
    }
  }

  const cardNumber = normalizeCardNumber(payload?.keyHex);
  if (cardNumber) {
    const card = await SkudCard.findOne({
      where: {
        externalSystem: DEFAULT_EXTERNAL_SYSTEM,
        cardNumberNormalized: cardNumber,
        status: "active",
      },
      order: [["updatedAt", "DESC"]],
    });

    if (card?.employeeId) {
      return {
        employeeId: card.employeeId,
        externalEmpId: externalEmpId || null,
        matchedBy: "card",
      };
    }
  }

  return {
    employeeId: null,
    externalEmpId,
    matchedBy: null,
  };
};

export const resolveDelegateDecision = async (payload) => {
  const resolved = await resolveEmployeeByPayload(payload || {});

  if (!resolved.employeeId) {
    return {
      allow: false,
      message: "Сотрудник не найден в СКУД-связках",
      employeeId: null,
      externalEmpId: resolved.externalEmpId,
      reasonCode: "employee_not_found",
    };
  }

  const state = await SkudAccessState.findOne({
    where: {
      employeeId: resolved.employeeId,
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    },
  });

  if (!state) {
    return {
      allow: false,
      message: "Нет активного допуска",
      employeeId: resolved.employeeId,
      externalEmpId: resolved.externalEmpId,
      reasonCode: "state_missing",
    };
  }

  if (state.status !== "allowed") {
    return {
      allow: false,
      message: state.statusReason || "Доступ запрещен",
      employeeId: resolved.employeeId,
      externalEmpId: resolved.externalEmpId,
      reasonCode: state.reasonCode || `state_${state.status}`,
    };
  }

  return {
    allow: true,
    message: "",
    employeeId: resolved.employeeId,
    externalEmpId: resolved.externalEmpId,
    reasonCode: "allowed",
  };
};

export const logDelegateDecision = async ({ payload, decision }) => {
  await SkudAccessEvent.create({
    externalSystem: DEFAULT_EXTERNAL_SYSTEM,
    source: "webdel",
    eventType: "delegate_decision",
    employeeId: decision.employeeId,
    externalEmpId: decision.externalEmpId,
    accessPoint: payload?.accessPoint ?? null,
    direction: payload?.direction ?? null,
    keyHex: payload?.keyHex ?? null,
    allow: decision.allow,
    decisionMessage: decision.message || null,
    eventTime: new Date(),
    rawPayload: {
      request: payload,
      decision,
    },
  });
};

export const ingestAccessEvents = async (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new AppError("logs должен быть непустым массивом", 400);
  }

  const records = [];
  const normalizedLogs = logs.map((rawLog) => {
    const log = rawLog || {};
    return {
      log,
      normalizedKey: normalizeCardNumber(log.keyHex),
      externalEmpId: log.empId ? String(log.empId) : null,
    };
  });

  const externalEmpIds = [
    ...new Set(
      normalizedLogs.map((item) => item.externalEmpId).filter(Boolean),
    ),
  ];
  const normalizedKeys = [
    ...new Set(
      normalizedLogs.map((item) => item.normalizedKey).filter(Boolean),
    ),
  ];

  const [bindings, cards] = await Promise.all([
    externalEmpIds.length > 0
      ? SkudPersonBinding.findAll({
          where: {
            externalSystem: DEFAULT_EXTERNAL_SYSTEM,
            isActive: true,
            externalEmpId: {
              [Op.in]: externalEmpIds,
            },
          },
          attributes: ["externalEmpId", "employeeId", "updatedAt"],
          order: [["updatedAt", "DESC"]],
        })
      : Promise.resolve([]),
    normalizedKeys.length > 0
      ? SkudCard.findAll({
          where: {
            externalSystem: DEFAULT_EXTERNAL_SYSTEM,
            status: "active",
            cardNumberNormalized: {
              [Op.in]: normalizedKeys,
            },
          },
          attributes: ["cardNumberNormalized", "employeeId", "updatedAt"],
          order: [["updatedAt", "DESC"]],
        })
      : Promise.resolve([]),
  ]);

  const employeeIdByExternalEmpId = new Map();
  for (const binding of bindings) {
    if (!binding?.externalEmpId || !binding?.employeeId) {
      continue;
    }
    if (!employeeIdByExternalEmpId.has(binding.externalEmpId)) {
      employeeIdByExternalEmpId.set(binding.externalEmpId, binding.employeeId);
    }
  }

  const employeeIdByCardKey = new Map();
  for (const card of cards) {
    if (!card?.cardNumberNormalized || !card?.employeeId) {
      continue;
    }
    if (!employeeIdByCardKey.has(card.cardNumberNormalized)) {
      employeeIdByCardKey.set(card.cardNumberNormalized, card.employeeId);
    }
  }

  for (const item of normalizedLogs) {
    const employeeId =
      (item.externalEmpId
        ? employeeIdByExternalEmpId.get(item.externalEmpId)
        : null) ||
      (item.normalizedKey
        ? employeeIdByCardKey.get(item.normalizedKey)
        : null) ||
      null;

    records.push({
      externalSystem: DEFAULT_EXTERNAL_SYSTEM,
      source: "webdel",
      eventType: "passage",
      logId: item.log.logId ?? null,
      employeeId,
      externalEmpId: item.externalEmpId,
      accessPoint: item.log.accessPoint ?? null,
      direction: item.log.direction ?? null,
      keyHex: item.log.keyHex ?? null,
      eventTime: toDateFromUnixSeconds(item.log.time),
      rawPayload: item.log,
    });
  }

  await SkudAccessEvent.bulkCreate(records, {
    ignoreDuplicates: true,
  });

  const maxLogId = logs.reduce((acc, item) => {
    const value = Number(item?.logId);
    if (Number.isNaN(value)) return acc;
    if (acc === null) return value;
    return Math.max(acc, value);
  }, null);

  return {
    received: logs.length,
    confirmedLogId: maxLogId,
  };
};
