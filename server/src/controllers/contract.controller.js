import { Contract, Counterparty, ConstructionSite } from "../models/index.js";
import { Op } from "sequelize";

const MAX_LIST_LIMIT = 100;
const CONTRACT_MUTABLE_FIELDS = [
  "contractNumber",
  "contractDate",
  "constructionSiteId",
  "counterparty1Id",
  "counterparty2Id",
  "type",
];

const sanitizeContractPayload = (payload = {}) => {
  const sanitized = {};
  for (const field of CONTRACT_MUTABLE_FIELDS) {
    if (payload[field] !== undefined) {
      sanitized[field] = payload[field];
    }
  }
  return sanitized;
};

// Получить все договоры
export const getAllContracts = async (req, res, next) => {
  try {
    const {
      type,
      constructionSiteId,
      search,
      page = 1,
      limit = 10,
    } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      MAX_LIST_LIMIT,
    );

    const where = {};

    if (type) where.type = type;
    if (constructionSiteId) where.construction_site_id = constructionSiteId;
    if (search) {
      where.contract_number = { [Op.iLike]: `%${search}%` };
    }

    const offset = (safePage - 1) * safeLimit;

    const { count, rows } = await Contract.findAndCountAll({
      where,
      include: [
        {
          model: ConstructionSite,
          as: "constructionSite",
          attributes: ["id", "shortName"],
        },
        {
          model: Counterparty,
          as: "counterparty1",
          attributes: ["id", "name", "type"],
        },
        {
          model: Counterparty,
          as: "counterparty2",
          attributes: ["id", "name", "type"],
        },
      ],
      limit: safeLimit,
      offset: parseInt(offset),
      order: [["contractDate", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        contracts: rows,
        pagination: {
          total: count,
          page: safePage,
          limit: safeLimit,
          pages: Math.ceil(count / safeLimit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    next(error);
  }
};

// Получить договор по ID
export const getContractById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contract = await Contract.findByPk(id, {
      include: [
        { model: ConstructionSite, as: "constructionSite" },
        { model: Counterparty, as: "counterparty1" },
        { model: Counterparty, as: "counterparty2" },
      ],
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Договор не найден",
      });
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    next(error);
  }
};

// Создать договор
export const createContract = async (req, res, next) => {
  try {
    const payload = sanitizeContractPayload(req.body);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Не переданы данные договора",
      });
    }

    const contract = await Contract.create({
      ...payload,
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: "Договор успешно создан",
      data: contract,
    });
  } catch (error) {
    console.error("Error creating contract:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Ошибка валидации",
        errors: error.errors.map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
    }

    next(error);
  }
};

// Обновить договор
export const updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Договор не найден",
      });
    }

    const payload = sanitizeContractPayload(req.body);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Нет полей для обновления",
      });
    }
    await contract.update({
      ...payload,
      updatedBy: req.user?.id || null,
    });

    res.json({
      success: true,
      message: "Договор успешно обновлен",
      data: contract,
    });
  } catch (error) {
    console.error("Error updating contract:", error);
    next(error);
  }
};

// Удалить договор
export const deleteContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Договор не найден",
      });
    }

    await contract.destroy();

    res.json({
      success: true,
      message: "Договор успешно удален",
    });
  } catch (error) {
    console.error("Error deleting contract:", error);
    next(error);
  }
};
