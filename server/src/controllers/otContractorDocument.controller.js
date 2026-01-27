import {
  OtDocument,
  OtCategory,
  OtContractorDocument,
  OtContractorDocumentHistory,
  Counterparty,
  ConstructionSite,
  File,
} from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  assertOtAccess,
  assertCounterpartySiteAccess,
} from "../utils/otAccess.js";
import { uploadOtFile } from "../services/otFileService.js";
import { recalculateStatus } from "../services/otStatusService.js";
import storageProvider from "../config/storage.js";

const buildStatusTree = (categories, documents, contractorDocs) => {
  const documentMap = new Map();
  contractorDocs.forEach((doc) => documentMap.set(doc.documentId, doc));

  const categoryMap = new Map();
  categories.forEach((category) => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      children: [],
      documents: [],
    });
  });

  documents.forEach((doc) => {
    const contractorDoc = documentMap.get(doc.id);
    const status = contractorDoc?.status || "not_uploaded";

    const node = categoryMap.get(doc.categoryId);
    if (node) {
      node.documents.push({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        isRequired: doc.isRequired,
        templateFileId: doc.templateFileId,
        status,
        contractorDocumentId: contractorDoc?.id || null,
        fileId: contractorDoc?.fileId || null,
        comment: contractorDoc?.comment || null,
        uploadedBy: contractorDoc?.uploadedBy || null,
        checkedBy: contractorDoc?.checkedBy || null,
        checkedAt: contractorDoc?.checkedAt || null,
        updatedAt: contractorDoc?.updatedAt || null,
      });
    }
  });

  const roots = [];
  categoryMap.forEach((node) => {
    if (node.parentId && categoryMap.has(node.parentId)) {
      categoryMap.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
};

const updateDocumentHistory = async (
  contractorDocumentId,
  status,
  comment,
  userId,
) => {
  await OtContractorDocumentHistory.update(
    { isActive: false },
    {
      where: {
        contractorDocumentId,
        isActive: true,
      },
    },
  );

  await OtContractorDocumentHistory.create({
    contractorDocumentId,
    status,
    comment,
    changedBy: userId,
    isActive: true,
  });
};

export const getOtContractorDocuments = async (req, res, next) => {
  try {
    const { isAdmin, isStaff } = await assertOtAccess(req.user);

    const { counterpartyId: counterpartyIdQuery, constructionSiteId } =
      req.query;

    if (!constructionSiteId) {
      throw new AppError("constructionSiteId обязателен", 400);
    }

    const counterpartyId = isStaff
      ? counterpartyIdQuery
      : req.user.counterpartyId;

    if (!counterpartyId) {
      throw new AppError("counterpartyId обязателен", 400);
    }

    await assertCounterpartySiteAccess(
      req.user,
      counterpartyId,
      constructionSiteId,
    );

    const [categories, documents, contractorDocs] = await Promise.all([
      OtCategory.findAll({
        where: { isDeleted: false },
        order: [
          ["sortOrder", "ASC"],
          ["createdAt", "ASC"],
        ],
      }),
      OtDocument.findAll({
        where: { isDeleted: false },
        order: [["createdAt", "ASC"]],
      }),
      OtContractorDocument.findAll({
        where: { counterpartyId, constructionSiteId },
      }),
    ]);

    const tree = buildStatusTree(categories, documents, contractorDocs);

    const stats = {
      total: 0,
      uploaded: 0,
      approved: 0,
      rejected: 0,
      not_uploaded: 0,
    };
    const countDocs = (nodes) => {
      nodes.forEach((node) => {
        node.documents.forEach((doc) => {
          stats.total += 1;
          stats[doc.status] += 1;
        });
        if (node.children.length > 0) {
          countDocs(node.children);
        }
      });
    };
    countDocs(tree);

    res.json({
      success: true,
      data: {
        counterpartyId,
        constructionSiteId,
        stats,
        categories: tree,
      },
    });
  } catch (error) {
    console.error("Error fetching OT contractor docs:", error);
    next(error);
  }
};

export const uploadOtContractorDocument = async (req, res, next) => {
  try {
    const { isStaff } = await assertOtAccess(req.user);

    const {
      documentId,
      constructionSiteId,
      counterpartyId: counterpartyIdBody,
    } = req.body;

    if (!req.file) {
      throw new AppError("Файл не предоставлен", 400);
    }

    if (!documentId || !constructionSiteId) {
      throw new AppError("documentId и constructionSiteId обязательны", 400);
    }

    const counterpartyId = isStaff
      ? counterpartyIdBody
      : req.user.counterpartyId;

    if (!counterpartyId) {
      throw new AppError("counterpartyId обязателен", 400);
    }

    await assertCounterpartySiteAccess(
      req.user,
      counterpartyId,
      constructionSiteId,
    );

    const document = await OtDocument.findByPk(documentId);
    if (!document || document.isDeleted) {
      throw new AppError("Документ не найден", 404);
    }

    const [counterparty, constructionSite] = await Promise.all([
      Counterparty.findByPk(counterpartyId),
      ConstructionSite.findByPk(constructionSiteId),
    ]);

    const fileRecord = await uploadOtFile({
      file: req.file,
      folderParts: [
        counterparty?.name || counterpartyId,
        constructionSite?.shortName ||
          constructionSite?.fullName ||
          constructionSiteId,
        document.name,
      ],
      uploadedBy: req.user.id,
      entityType: "other",
      entityId: documentId,
    });

    let contractorDocument = await OtContractorDocument.findOne({
      where: { documentId, counterpartyId, constructionSiteId },
    });

    if (contractorDocument) {
      await contractorDocument.update({
        fileId: fileRecord.id,
        status: "uploaded",
        comment: null,
        uploadedBy: req.user.id,
        checkedBy: null,
        checkedAt: null,
      });
    } else {
      contractorDocument = await OtContractorDocument.create({
        documentId,
        counterpartyId,
        constructionSiteId,
        fileId: fileRecord.id,
        status: "uploaded",
        uploadedBy: req.user.id,
      });
    }

    await updateDocumentHistory(
      contractorDocument.id,
      "uploaded",
      null,
      req.user.id,
    );
    await recalculateStatus(counterpartyId, constructionSiteId, req.user.id);

    res.status(201).json({
      success: true,
      message: "Документ загружен",
      data: contractorDocument,
    });
  } catch (error) {
    console.error("Error uploading OT contractor doc:", error);
    next(error);
  }
};

export const approveOtContractorDocument = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireStaff: true });

    const { id } = req.params;

    const contractorDocument = await OtContractorDocument.findByPk(id);
    if (!contractorDocument) {
      throw new AppError("Документ подрядчика не найден", 404);
    }

    await contractorDocument.update({
      status: "approved",
      comment: null,
      checkedBy: req.user.id,
      checkedAt: new Date(),
    });

    await updateDocumentHistory(
      contractorDocument.id,
      "approved",
      null,
      req.user.id,
    );

    await recalculateStatus(
      contractorDocument.counterpartyId,
      contractorDocument.constructionSiteId,
      req.user.id,
    );

    res.json({
      success: true,
      message: "Документ подтвержден",
      data: contractorDocument,
    });
  } catch (error) {
    console.error("Error approving OT contractor doc:", error);
    next(error);
  }
};

export const rejectOtContractorDocument = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireStaff: true });

    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      throw new AppError("Комментарий обязателен", 400);
    }

    const contractorDocument = await OtContractorDocument.findByPk(id);
    if (!contractorDocument) {
      throw new AppError("Документ подрядчика не найден", 404);
    }

    await contractorDocument.update({
      status: "rejected",
      comment,
      checkedBy: req.user.id,
      checkedAt: new Date(),
    });

    await updateDocumentHistory(
      contractorDocument.id,
      "rejected",
      comment,
      req.user.id,
    );

    await recalculateStatus(
      contractorDocument.counterpartyId,
      contractorDocument.constructionSiteId,
      req.user.id,
    );

    res.json({
      success: true,
      message: "Документ отклонен",
      data: contractorDocument,
    });
  } catch (error) {
    console.error("Error rejecting OT contractor doc:", error);
    next(error);
  }
};

export const downloadOtContractorDocumentFile = async (req, res, next) => {
  try {
    const { isStaff } = await assertOtAccess(req.user);

    const { id } = req.params;

    const contractorDocument = await OtContractorDocument.findByPk(id);
    if (!contractorDocument) {
      throw new AppError("Документ подрядчика не найден", 404);
    }

    if (
      !isStaff &&
      contractorDocument.counterpartyId !== req.user.counterpartyId
    ) {
      throw new AppError("Нет доступа к документу", 403);
    }

    const file = await File.findByPk(contractorDocument.fileId);
    if (!file || file.isDeleted) {
      throw new AppError("Файл не найден", 404);
    }

    const downloadData = await storageProvider.getDownloadUrl(file.filePath, {
      expiresIn: 3600,
      fileName: file.originalName || file.fileName,
    });

    res.json({
      success: true,
      data: {
        url: downloadData.url,
        fileName: file.originalName || file.fileName,
      },
    });
  } catch (error) {
    console.error("Error downloading OT contractor doc file:", error);
    next(error);
  }
};
