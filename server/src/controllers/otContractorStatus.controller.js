import {
  Counterparty,
  CounterpartyConstructionSiteMapping,
  OtContractorStatus,
} from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  assertOtAccess,
  assertCounterpartySiteAccess,
} from "../utils/otAccess.js";
import {
  getEffectiveStatus,
  recalculateStatus,
  overrideStatus,
} from "../services/otStatusService.js";

export const getOtContractorStatuses = async (req, res, next) => {
  try {
    const { isAdmin, isStaff } = await assertOtAccess(req.user);

    const { constructionSiteId, counterpartyId: counterpartyIdQuery } =
      req.query;

    if (!constructionSiteId) {
      throw new AppError("constructionSiteId обязателен", 400);
    }

    let counterpartyIds = [];

    if (isStaff) {
      if (counterpartyIdQuery) {
        counterpartyIds = [counterpartyIdQuery];
      } else {
        const mappings = await CounterpartyConstructionSiteMapping.findAll({
          where: { constructionSiteId },
          attributes: ["counterpartyId"],
        });
        counterpartyIds = mappings.map((mapping) => mapping.counterpartyId);
      }
    } else {
      counterpartyIds = [req.user.counterpartyId];
      await assertCounterpartySiteAccess(
        req.user,
        req.user.counterpartyId,
        constructionSiteId,
      );
    }

    if (counterpartyIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const counterparties = await Counterparty.findAll({
      where: { id: counterpartyIds },
      attributes: ["id", "name", "inn"],
    });

    const statuses = await Promise.all(
      counterparties.map(async (counterparty) => {
        const effective = await getEffectiveStatus(
          counterparty.id,
          constructionSiteId,
        );
        const existing = await OtContractorStatus.findOne({
          where: {
            counterpartyId: counterparty.id,
            constructionSiteId,
          },
        });

        return {
          counterparty,
          status: effective.status,
          isManual: effective.isManual || existing?.isManual || false,
          missingRequired: effective.missingDocuments?.length || 0,
          totalRequired: effective.totalRequired || 0,
          approvedRequired: effective.approvedRequired || 0,
        };
      }),
    );

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error("Error fetching OT contractor statuses:", error);
    next(error);
  }
};

export const overrideOtContractorStatus = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { counterpartyId, siteId } = req.params;

    if (!counterpartyId || !siteId) {
      throw new AppError("counterpartyId и siteId обязательны", 400);
    }

    const record = await overrideStatus(
      counterpartyId,
      siteId,
      req.user.id,
      "temp_admitted",
    );

    res.json({
      success: true,
      message: "Статус временного допуска установлен",
      data: record,
    });
  } catch (error) {
    console.error("Error overriding OT contractor status:", error);
    next(error);
  }
};

export const recalculateOtContractorStatus = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { counterpartyId, siteId } = req.params;

    if (!counterpartyId || !siteId) {
      throw new AppError("counterpartyId и siteId обязательны", 400);
    }

    const result = await recalculateStatus(
      counterpartyId,
      siteId,
      req.user.id,
      {
        force: true,
      },
    );

    res.json({
      success: true,
      message: "Статус пересчитан",
      data: {
        status: result.status,
        isManual: result.isManual,
        missingRequired: result.missingDocuments?.length || 0,
        totalRequired: result.totalRequired || 0,
        approvedRequired: result.approvedRequired || 0,
      },
    });
  } catch (error) {
    console.error("Error recalculating OT contractor status:", error);
    next(error);
  }
};
