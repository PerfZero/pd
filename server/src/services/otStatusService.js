import {
  OtContractorStatus,
  OtContractorStatusHistory,
  OtDocument,
  OtContractorDocument,
  Counterparty,
  ConstructionSite,
} from "../models/index.js";
import { sequelize } from "../config/database.js";
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

  if (existing && existing.isManual) {
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

export const getEffectiveStatusesBulk = async (
  counterpartyIds,
  constructionSiteId,
) => {
  if (!counterpartyIds.length) return [];

  const requiredDocs = await getRequiredDocuments();
  const totalRequired = requiredDocs.length;
  const requiredIds = requiredDocs.map((doc) => doc.id);

  const existingManualStatuses = await OtContractorStatus.findAll({
    where: { counterpartyId: counterpartyIds, constructionSiteId },
  });
  const manualMap = new Map(
    existingManualStatuses.map((record) => [record.counterpartyId, record]),
  );

  if (totalRequired === 0) {
    return counterpartyIds.map((counterpartyId) => ({
      counterpartyId,
      status: "admitted",
      isManual: false,
      missingRequired: 0,
      totalRequired: 0,
      approvedRequired: 0,
    }));
  }

  const contractorDocs = await OtContractorDocument.findAll({
    where: {
      counterpartyId: counterpartyIds,
      constructionSiteId,
      documentId: requiredIds,
    },
    attributes: ["counterpartyId", "documentId", "status"],
  });

  const approvedByCounterparty = new Map();
  contractorDocs.forEach((doc) => {
    if (doc.status !== "approved") return;
    const existing = approvedByCounterparty.get(doc.counterpartyId);
    if (existing) {
      existing.add(doc.documentId);
    } else {
      approvedByCounterparty.set(doc.counterpartyId, new Set([doc.documentId]));
    }
  });

  return counterpartyIds.map((counterpartyId) => {
    const manualRecord = manualMap.get(counterpartyId);
    if (manualRecord?.isManual) {
      return {
        counterpartyId,
        status: manualRecord.status,
        isManual: true,
        missingRequired: 0,
        totalRequired: 0,
        approvedRequired: 0,
      };
    }

    const approvedSet = approvedByCounterparty.get(counterpartyId);
    const approvedRequired = approvedSet ? approvedSet.size : 0;
    const missingRequired = totalRequired - approvedRequired;
    const status = missingRequired === 0 ? "admitted" : "not_admitted";

    return {
      counterpartyId,
      status,
      isManual: false,
      missingRequired,
      totalRequired,
      approvedRequired,
    };
  });
};

export const getStatusSummaryForSites = async (
  constructionSiteIds,
  mappings,
) => {
  const countsBySite = new Map(
    constructionSiteIds.map((siteId) => [
      siteId,
      { admitted: 0, not_admitted: 0, temp_admitted: 0, blocked: 0 },
    ]),
  );

  if (!mappings.length) {
    return constructionSiteIds.map((constructionSiteId) => ({
      constructionSiteId,
      counts: countsBySite.get(constructionSiteId),
    }));
  }

  const counterpartyIds = [
    ...new Set(mappings.map((mapping) => mapping.counterpartyId)),
  ];

  const requiredDocs = await getRequiredDocuments();
  const totalRequired = requiredDocs.length;
  const requiredIds = requiredDocs.map((doc) => doc.id);

  const manualStatuses = await OtContractorStatus.findAll({
    where: {
      constructionSiteId: constructionSiteIds,
      counterpartyId: counterpartyIds,
      isManual: true,
    },
    attributes: ["constructionSiteId", "counterpartyId", "status"],
  });
  const manualMap = new Map(
    manualStatuses.map((record) => [
      `${record.constructionSiteId}:${record.counterpartyId}`,
      record.status,
    ]),
  );

  if (totalRequired === 0) {
    mappings.forEach((mapping) => {
      const key = `${mapping.constructionSiteId}:${mapping.counterpartyId}`;
      const counts = countsBySite.get(mapping.constructionSiteId);
      if (!counts) return;
      const manualStatus = manualMap.get(key);
      if (!manualStatus) {
        counts.admitted += 1;
        return;
      }
      if (manualStatus === "temp_admitted") counts.temp_admitted += 1;
      else if (manualStatus === "blocked") counts.blocked += 1;
      else if (manualStatus === "not_admitted") counts.not_admitted += 1;
      else counts.admitted += 1;
    });

    return constructionSiteIds.map((constructionSiteId) => ({
      constructionSiteId,
      counts: countsBySite.get(constructionSiteId),
    }));
  }

  const approvedCounts = await OtContractorDocument.findAll({
    where: {
      constructionSiteId: constructionSiteIds,
      counterpartyId: counterpartyIds,
      documentId: requiredIds,
      status: "approved",
    },
    attributes: [
      "constructionSiteId",
      "counterpartyId",
      [sequelize.fn("COUNT", sequelize.col("document_id")), "approvedRequired"],
    ],
    group: ["constructionSiteId", "counterpartyId"],
    raw: true,
  });

  const approvedMap = new Map(
    approvedCounts.map((row) => [
      `${row.constructionSiteId}:${row.counterpartyId}`,
      Number(row.approvedRequired || 0),
    ]),
  );

  mappings.forEach((mapping) => {
    const key = `${mapping.constructionSiteId}:${mapping.counterpartyId}`;
    const counts = countsBySite.get(mapping.constructionSiteId);
    if (!counts) return;

    const manualStatus = manualMap.get(key);
    if (manualStatus) {
      if (manualStatus === "temp_admitted") counts.temp_admitted += 1;
      else if (manualStatus === "blocked") counts.blocked += 1;
      else if (manualStatus === "not_admitted") counts.not_admitted += 1;
      else counts.admitted += 1;
      return;
    }

    const approvedRequired = approvedMap.get(key) || 0;
    if (approvedRequired >= totalRequired) {
      counts.admitted += 1;
    } else {
      counts.not_admitted += 1;
    }
  });

  return constructionSiteIds.map((constructionSiteId) => ({
    constructionSiteId,
    counts: countsBySite.get(constructionSiteId),
  }));
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

  if (existing && existing.isManual && !force) {
    return {
      status: existing.status,
      isManual: true,
      record: existing,
      missingDocuments: [],
      totalRequired: 0,
      approvedRequired: 0,
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
