import {
  Department,
  Counterparty,
  ConstructionSite,
  Setting,
} from "../models/index.js";
import { Op } from "sequelize";

// Получить все подразделения (с фильтрацией по контрагенту пользователя)
export const getAllDepartments = async (req, res, next) => {
  try {
    const { search = "" } = req.query;
    const userCounterpartyId = req.user.counterpartyId;
    const defaultCounterpartyId = await Setting.getSetting(
      "default_counterparty_id",
    );
    const effectiveCounterpartyId = userCounterpartyId || defaultCounterpartyId;

    const where = {
      counterparty_id: effectiveCounterpartyId, // Пользователь видит только свои подразделения
    };

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const departments = await Department.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "counterparty",
          attributes: ["id", "name"],
        },
        {
          model: ConstructionSite,
          as: "constructionSite",
          attributes: ["id", "shortName", "fullName"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      data: { departments },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    next(error);
  }
};

// Получить подразделение по ID
export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userCounterpartyId = req.user.counterpartyId;
    const defaultCounterpartyId = await Setting.getSetting(
      "default_counterparty_id",
    );
    const effectiveCounterpartyId = userCounterpartyId || defaultCounterpartyId;

    const department = await Department.findOne({
      where: {
        id,
        counterparty_id: effectiveCounterpartyId,
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
          attributes: ["id", "name"],
        },
        {
          model: ConstructionSite,
          as: "constructionSite",
          attributes: ["id", "shortName", "fullName"],
          required: false,
        },
      ],
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Подразделение не найдено",
      });
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("Error fetching department:", error);
    next(error);
  }
};

// Создать подразделение
export const createDepartment = async (req, res, next) => {
  try {
    const { name, constructionSiteId, counterpartyId } = req.body;
    const userCounterpartyId = req.user.counterpartyId;
    let targetCounterpartyId = userCounterpartyId;

    if (req.user.role === "admin" && counterpartyId) {
      targetCounterpartyId = counterpartyId;
    }

    if (!targetCounterpartyId) {
      const defaultCounterpartyId = await Setting.getSetting(
        "default_counterparty_id",
      );
      targetCounterpartyId = defaultCounterpartyId || null;
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Название подразделения не может быть пустым",
      });
    }

    if (!targetCounterpartyId) {
      return res.status(400).json({
        success: false,
        message: "Не указан контрагент для подразделения",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      counterpartyId: targetCounterpartyId,
      constructionSiteId: constructionSiteId || null,
    });

    res.status(201).json({
      success: true,
      message: "Подразделение создано",
      data: department,
    });
  } catch (error) {
    console.error("Error creating department:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Подразделение с таким названием уже существует",
      });
    }

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

// Обновить подразделение
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, constructionSiteId } = req.body;
    const userCounterpartyId = req.user.counterpartyId;
    const defaultCounterpartyId = await Setting.getSetting(
      "default_counterparty_id",
    );
    const effectiveCounterpartyId = userCounterpartyId || defaultCounterpartyId;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Название подразделения не может быть пустым",
      });
    }

    const department = await Department.findOne({
      where: {
        id,
        counterparty_id: effectiveCounterpartyId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Подразделение не найдено",
      });
    }

    await department.update({
      name: name.trim(),
      constructionSiteId:
        constructionSiteId !== undefined
          ? constructionSiteId || null
          : department.constructionSiteId,
    });

    res.json({
      success: true,
      message: "Подразделение обновлено",
      data: department,
    });
  } catch (error) {
    console.error("Error updating department:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Подразделение с таким названием уже существует",
      });
    }

    next(error);
  }
};

// Удалить подразделение
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userCounterpartyId = req.user.counterpartyId;
    const defaultCounterpartyId = await Setting.getSetting(
      "default_counterparty_id",
    );
    const effectiveCounterpartyId = userCounterpartyId || defaultCounterpartyId;

    const department = await Department.findOne({
      where: {
        id,
        counterparty_id: effectiveCounterpartyId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Подразделение не найдено",
      });
    }

    await department.destroy();

    res.json({
      success: true,
      message: "Подразделение удалено",
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    next(error);
  }
};
