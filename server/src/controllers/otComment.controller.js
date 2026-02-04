import { OtComment, OtContractorDocument, User } from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  assertOtAccess,
  assertCounterpartyAccess,
  assertCounterpartySiteAccess,
} from "../utils/otAccess.js";

export const getOtComments = async (req, res, next) => {
  try {
    await assertOtAccess(req.user);

    const { type, counterpartyId, constructionSiteId, contractorDocumentId } =
      req.query;

    if (!type) {
      throw new AppError("type обязателен", 400);
    }

    const where = { type };

    if (type === "contractor") {
      if (!counterpartyId || !constructionSiteId) {
        throw new AppError(
          "counterpartyId и constructionSiteId обязательны",
          400,
        );
      }
      await assertCounterpartySiteAccess(
        req.user,
        counterpartyId,
        constructionSiteId,
      );
      where.counterpartyId = counterpartyId;
      where.constructionSiteId = constructionSiteId;
    }

    if (type === "document") {
      if (!contractorDocumentId) {
        throw new AppError("contractorDocumentId обязателен", 400);
      }
      const doc = await OtContractorDocument.findByPk(contractorDocumentId);
      if (!doc) {
        throw new AppError("Документ подрядчика не найден", 404);
      }
      await assertCounterpartyAccess(req.user, doc.counterpartyId);
      where.contractorDocumentId = contractorDocumentId;
    }

    const comments = await OtComment.findAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("Error fetching OT comments:", error);
    next(error);
  }
};

export const createOtComment = async (req, res, next) => {
  try {
    await assertOtAccess(req.user);

    const {
      type,
      counterpartyId,
      constructionSiteId,
      contractorDocumentId,
      text,
    } = req.body;

    if (!type || !text) {
      throw new AppError("type и text обязательны", 400);
    }

    const data = {
      type,
      text,
      createdBy: req.user.id,
    };

    if (type === "contractor") {
      if (!counterpartyId || !constructionSiteId) {
        throw new AppError(
          "counterpartyId и constructionSiteId обязательны",
          400,
        );
      }
      await assertCounterpartySiteAccess(
        req.user,
        counterpartyId,
        constructionSiteId,
      );
      data.counterpartyId = counterpartyId;
      data.constructionSiteId = constructionSiteId;
    }

    if (type === "document") {
      if (!contractorDocumentId) {
        throw new AppError("contractorDocumentId обязателен", 400);
      }
      const doc = await OtContractorDocument.findByPk(contractorDocumentId);
      if (!doc) {
        throw new AppError("Документ подрядчика не найден", 404);
      }
      await assertCounterpartyAccess(req.user, doc.counterpartyId);
      data.contractorDocumentId = contractorDocumentId;
    }

    const comment = await OtComment.create(data);

    res.status(201).json({
      success: true,
      message: "Комментарий добавлен",
      data: comment,
    });
  } catch (error) {
    console.error("Error creating OT comment:", error);
    next(error);
  }
};

export const updateOtComment = async (req, res, next) => {
  try {
    const access = await assertOtAccess(req.user);

    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      throw new AppError("text обязателен", 400);
    }

    const comment = await OtComment.findByPk(id);

    if (!comment) {
      throw new AppError("Комментарий не найден", 404);
    }

    // Проверка доступа по типу комментария
    if (comment.type === "contractor") {
      await assertCounterpartySiteAccess(
        req.user,
        comment.counterpartyId,
        comment.constructionSiteId,
      );
    } else if (comment.type === "document") {
      const doc = await OtContractorDocument.findByPk(
        comment.contractorDocumentId,
      );
      if (!doc) {
        throw new AppError("Документ подрядчика не найден", 404);
      }
      await assertCounterpartyAccess(req.user, doc.counterpartyId);
    }

    if (!access.isStaff && comment.createdBy !== req.user.id) {
      throw new AppError("Недостаточно прав", 403);
    }

    await comment.update({ text });

    res.json({
      success: true,
      message: "Комментарий обновлен",
      data: comment,
    });
  } catch (error) {
    console.error("Error updating OT comment:", error);
    next(error);
  }
};

export const deleteOtComment = async (req, res, next) => {
  try {
    const access = await assertOtAccess(req.user);

    const { id } = req.params;
    const comment = await OtComment.findByPk(id);

    if (!comment) {
      throw new AppError("Комментарий не найден", 404);
    }

    // Проверка доступа по типу комментария
    if (comment.type === "contractor") {
      await assertCounterpartySiteAccess(
        req.user,
        comment.counterpartyId,
        comment.constructionSiteId,
      );
    } else if (comment.type === "document") {
      const doc = await OtContractorDocument.findByPk(
        comment.contractorDocumentId,
      );
      if (!doc) {
        throw new AppError("Документ подрядчика не найден", 404);
      }
      await assertCounterpartyAccess(req.user, doc.counterpartyId);
    }

    if (!access.isStaff && comment.createdBy !== req.user.id) {
      throw new AppError("Недостаточно прав", 403);
    }

    await comment.destroy();

    res.json({
      success: true,
      message: "Комментарий удален",
    });
  } catch (error) {
    console.error("Error deleting OT comment:", error);
    next(error);
  }
};
