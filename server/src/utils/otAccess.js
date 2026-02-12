import {
  CounterpartyConstructionSiteMapping,
  Setting,
} from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";

export const getDefaultCounterpartyId = async () => {
  return await Setting.getSetting("default_counterparty_id");
};

export const assertOtAccess = async (
  user,
  { requireAdmin = false, requireStaff = false } = {},
) => {
  if (!user) {
    throw new AppError("Необходима авторизация", 401);
  }

  if (user.role === "admin") {
    return {
      isAdmin: true,
      isOtAdmin: false,
      isEngineer: false,
      isStaff: true,
      isContractor: false,
    };
  }

  if (user.role === "ot_admin") {
    return {
      isAdmin: false,
      isOtAdmin: true,
      isEngineer: false,
      isStaff: true,
      isContractor: false,
    };
  }

  if (user.role === "ot_engineer") {
    if (requireAdmin) {
      throw new AppError("Недостаточно прав", 403);
    }

    return {
      isAdmin: false,
      isOtAdmin: false,
      isEngineer: true,
      isStaff: true,
      isContractor: false,
    };
  }

  if (user.role === "manager") {
    throw new AppError("Доступ запрещен", 403);
  }

  if (requireAdmin || requireStaff) {
    throw new AppError("Недостаточно прав", 403);
  }

  if (!user.counterpartyId) {
    throw new AppError("Доступ запрещен", 403);
  }

  return {
    isAdmin: false,
    isOtAdmin: false,
    isEngineer: false,
    isStaff: false,
    isContractor: true,
  };
};

export const assertCounterpartyAccess = async (user, counterpartyId) => {
  const { isStaff } = await assertOtAccess(user, { requireAdmin: false });
  if (isStaff) return;

  if (user.counterpartyId !== counterpartyId) {
    throw new AppError("Нет доступа к контрагенту", 403);
  }
};

export const assertCounterpartySiteAccess = async (
  user,
  counterpartyId,
  constructionSiteId,
) => {
  const { isStaff } = await assertOtAccess(user, { requireAdmin: false });
  if (isStaff) return;

  if (!counterpartyId || user.counterpartyId !== counterpartyId) {
    throw new AppError("Нет доступа к контрагенту", 403);
  }

  if (!constructionSiteId) {
    throw new AppError("Не указан объект строительства", 400);
  }

  const mapping = await CounterpartyConstructionSiteMapping.findOne({
    where: {
      counterpartyId,
      constructionSiteId,
    },
  });

  if (!mapping) {
    throw new AppError("Нет доступа к объекту строительства", 403);
  }
};
