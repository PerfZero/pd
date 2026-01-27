import {
  OtContractorStatus,
  OtContractorStatusHistory,
  OtDocument,
  OtContractorDocument,
  Counterparty,
  ConstructionSite,
} from "../models/index.js";
import { notifyNotAdmitted } from "./otNotificationService.js";

const getRequiredDocuments = async () => {
  return await OtDocument.findAll({
    where: {
      isRequired: true,
      isDeleted: false,
    },
    order: [["createdAt", "ASC"]],
  });
};

export const calculateStatus = async (counterpartyId, constructionSiteId) => {
  const requiredDocs = await getRequiredDocuments();

  if (requiredDocs.length === 0) {
    return {
      status: "admitted",
      missingDocuments: [],
      totalRequired: 0,
      approvedRequired: 0,
    };
  }

  const requiredIds = requiredDocs.map((doc) => doc.id);

  const contractorDocs = await OtContractorDocument.findAll({
    where: {
      counterpartyId,
      constructionSiteId,
      documentId: requiredIds,
    },
  });

  const statusByDocId = new Map(
    contractorDocs.map((doc) => [doc.documentId, doc.status]),
  );

  const missingDocuments = requiredDocs.filter((doc) => {
    const status = statusByDocId.get(doc.id);
    return status !== "approved";
  });

  const approvedRequired = requiredDocs.length - missingDocuments.length;
  const status = missingDocuments.length === 0 ? "admitted" : "not_admitted";

  return {
    status,
    missingDocuments,
    totalRequired: requiredDocs.length,
    approvedRequired,
  };
};

export const getEffectiveStatus = async (
  counterpartyId,
  constructionSiteId,
) => {
  const existing = await OtContractorStatus.findOne({
    where: { counterpartyId, constructionSiteId },
  });

  if (existing && existing.isManual && existing.status === "temp_admitted") {
    return {
      status: existing.status,
      isManual: true,
      missingDocuments: [],
      totalRequired: 0,
      approvedRequired: 0,
    };
  }

  const calculation = await calculateStatus(counterpartyId, constructionSiteId);
  return {
    ...calculation,
    isManual: false,
  };
};

export const recalculateStatus = async (
  counterpartyId,
  constructionSiteId,
  changedBy,
  options = {},
) => {
  const { transaction = null, force = false } = options;

  const existing = await OtContractorStatus.findOne({
    where: { counterpartyId, constructionSiteId },
    transaction,
  });

  if (
    existing &&
    existing.isManual &&
    existing.status === "temp_admitted" &&
    !force
  ) {
    return {
      status: existing.status,
      isManual: true,
      record: existing,
      missingDocuments: [],
    };
  }

  const calculation = await calculateStatus(counterpartyId, constructionSiteId);

  let record = existing;
  const previousStatus = existing?.status || null;

  if (record) {
    await record.update(
      {
        status: calculation.status,
        isManual: false,
      },
      { transaction },
    );
  } else {
    record = await OtContractorStatus.create(
      {
        counterpartyId,
        constructionSiteId,
        status: calculation.status,
        isManual: false,
      },
      { transaction },
    );
  }

  if (previousStatus !== calculation.status) {
    await OtContractorStatusHistory.update(
      { isActive: false },
      {
        where: {
          counterpartyId,
          constructionSiteId,
          isActive: true,
        },
        transaction,
      },
    );

    await OtContractorStatusHistory.create(
      {
        counterpartyId,
        constructionSiteId,
        status: calculation.status,
        changedBy,
        isActive: true,
      },
      { transaction },
    );

    if (calculation.status === "not_admitted") {
      const [counterparty, constructionSite] = await Promise.all([
        Counterparty.findByPk(counterpartyId),
        ConstructionSite.findByPk(constructionSiteId),
      ]);

      await notifyNotAdmitted({
        counterparty,
        constructionSite,
        missingDocuments: calculation.missingDocuments,
        changedBy,
      });
    }
  }

  return {
    status: calculation.status,
    isManual: false,
    record,
    missingDocuments: calculation.missingDocuments,
    totalRequired: calculation.totalRequired,
    approvedRequired: calculation.approvedRequired,
  };
};

export const overrideStatus = async (
  counterpartyId,
  constructionSiteId,
  changedBy,
  status = "temp_admitted",
  options = {},
) => {
  const { transaction = null } = options;

  const existing = await OtContractorStatus.findOne({
    where: { counterpartyId, constructionSiteId },
    transaction,
  });

  let record = existing;
  const previousStatus = existing?.status || null;

  if (record) {
    await record.update(
      {
        status,
        isManual: true,
      },
      { transaction },
    );
  } else {
    record = await OtContractorStatus.create(
      {
        counterpartyId,
        constructionSiteId,
        status,
        isManual: true,
      },
      { transaction },
    );
  }

  if (previousStatus !== status) {
    await OtContractorStatusHistory.update(
      { isActive: false },
      {
        where: {
          counterpartyId,
          constructionSiteId,
          isActive: true,
        },
        transaction,
      },
    );

    await OtContractorStatusHistory.create(
      {
        counterpartyId,
        constructionSiteId,
        status,
        changedBy,
        isActive: true,
      },
      { transaction },
    );
  }

  return record;
};
