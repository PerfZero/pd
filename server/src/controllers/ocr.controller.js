import axios from "axios";
import { AppError } from "../middleware/errorHandler.js";
import {
  File,
  Employee,
  Counterparty,
  EmployeeCounterpartyMapping,
} from "../models/index.js";
import storageProvider from "../config/storage.js";
import { checkEmployeeAccess } from "../utils/permissionUtils.js";
import { recognizeDocument } from "../services/ocr/ocrService.js";

const MAX_IMAGE_SIZE_BYTES = Number(
  process.env.OCR_MAX_FILE_SIZE || 10 * 1024 * 1024,
);

const fetchEmployeeWithMappings = async (employeeId) => {
  return Employee.findByPk(employeeId, {
    include: [
      {
        model: EmployeeCounterpartyMapping,
        as: "employeeCounterpartyMappings",
        include: [
          {
            model: Counterparty,
            as: "counterparty",
            attributes: ["id", "name"],
          },
        ],
      },
    ],
  });
};

const fetchFileWithEmployee = async (fileId) => {
  return File.findOne({
    where: {
      id: fileId,
      isDeleted: false,
      entityType: "employee",
    },
    include: [
      {
        model: Employee,
        as: "employee",
        include: [
          {
            model: EmployeeCounterpartyMapping,
            as: "employeeCounterpartyMappings",
            include: [
              {
                model: Counterparty,
                as: "counterparty",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
    ],
  });
};

const ensureImageMimeType = (mimeType = "") => {
  if (!mimeType.startsWith("image/")) {
    throw new AppError("OCR пилота поддерживает только изображения", 400);
  }
};

const ensureFileSize = (size) => {
  if (!size || size <= 0) {
    throw new AppError("Пустой файл не поддерживается", 400);
  }
  if (size > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError(
      `Файл превышает лимит OCR (${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB)`,
      400,
    );
  }
};

const buildImageDataUrl = (buffer, mimeType) =>
  `data:${mimeType};base64,${buffer.toString("base64")}`;

const fetchStoredFileBuffer = async (filePath) => {
  if (typeof storageProvider.getFileBuffer === "function") {
    return storageProvider.getFileBuffer(filePath);
  }

  if (typeof storageProvider.getDownloadUrl !== "function") {
    throw new AppError(
      "Текущий storage-провайдер не поддерживает чтение файла для OCR",
      500,
    );
  }

  const download = await storageProvider.getDownloadUrl(filePath);
  if (!download?.url) {
    throw new AppError("Не удалось получить ссылку на файл для OCR", 500);
  }

  const response = await axios.get(download.url, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
};

const tryDecryptFileBuffer = async (buffer, fileRecord) => {
  if (fileRecord.isEncrypted !== true) {
    return buffer;
  }

  try {
    const module = await import("../services/fileEncryptionService.js");
    if (typeof module.decryptFileBuffer !== "function") {
      throw new Error("decryptFileBuffer export not found");
    }

    return module.decryptFileBuffer(buffer, {
      encryptionAlgorithm: fileRecord.encryptionAlgorithm,
      encryptionKeyVersion: fileRecord.encryptionKeyVersion,
      encryptionIv: fileRecord.encryptionIv,
      encryptionTag: fileRecord.encryptionTag,
      documentType: fileRecord.documentType,
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Cannot find module") ||
      message.includes("ERR_MODULE_NOT_FOUND")
    ) {
      throw new AppError(
        "OCR временно недоступен для зашифрованных файлов (модуль дешифрования не найден на сервере)",
        503,
      );
    }
    throw new AppError("Ошибка дешифрования файла для OCR", 500);
  }
};

const getImageSource = async (req) => {
  const body = req.body || {};
  const hasUpload = !!req.file;
  const fileId = body.fileId || null;
  const employeeId = body.employeeId || null;

  if (hasUpload) {
    ensureImageMimeType(req.file.mimetype || "");
    ensureFileSize(req.file.size || req.file.buffer?.length || 0);

    if (!employeeId) {
      throw new AppError("Для прямой загрузки OCR требуется employeeId", 400);
    }

    const employee = await fetchEmployeeWithMappings(employeeId);
    if (!employee || employee.isDeleted) {
      throw new AppError("Сотрудник не найден", 404);
    }
    await checkEmployeeAccess(req.user, employee);

    return {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      source: "upload",
      fileRecord: null,
    };
  }

  if (!fileId) {
    throw new AppError("Требуется fileId или multipart file", 400);
  }

  const fileRecord = await fetchFileWithEmployee(fileId);
  if (!fileRecord) {
    throw new AppError("Файл не найден", 404);
  }
  if (!fileRecord.employee) {
    throw new AppError("Файл не привязан к сотруднику", 400);
  }

  await checkEmployeeAccess(req.user, fileRecord.employee);
  ensureImageMimeType(fileRecord.mimeType || "");
  ensureFileSize(fileRecord.fileSize || 0);

  const storedBuffer = await fetchStoredFileBuffer(fileRecord.filePath);
  const decryptedBuffer = await tryDecryptFileBuffer(storedBuffer, fileRecord);

  return {
    buffer: decryptedBuffer,
    mimeType: fileRecord.mimeType,
    source: "fileId",
    fileRecord,
  };
};

export const recognizeDocumentFromImage = async (req, res, next) => {
  try {
    const body = req.body || {};
    const documentType = body.documentType || body.type;
    if (!documentType) {
      throw new AppError("documentType обязателен", 400);
    }

    const imageSource = await getImageSource(req);
    const imageDataUrl = buildImageDataUrl(
      imageSource.buffer,
      imageSource.mimeType,
    );

    const result = await recognizeDocument({
      documentType,
      imageDataUrl,
      model: body.model,
      prompt: body.prompt,
    });

    return res.json({
      success: true,
      data: {
        ...result,
        source: imageSource.source,
        fileId: imageSource.fileRecord?.id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmRecognizedDocument = async (req, res, next) => {
  try {
    const { fileId, provider, result } = req.body || {};
    if (!fileId) {
      throw new AppError("fileId обязателен", 400);
    }

    const fileRecord = await fetchFileWithEmployee(fileId);
    if (!fileRecord) {
      throw new AppError("Файл не найден", 404);
    }
    if (!fileRecord.employee) {
      throw new AppError("Файл не привязан к сотруднику", 400);
    }

    await checkEmployeeAccess(req.user, fileRecord.employee);

    const normalizedProvider =
      typeof provider === "string" ? provider.slice(0, 64) : null;
    const normalizedResult =
      result && typeof result === "object" && !Array.isArray(result)
        ? JSON.stringify(result)
        : null;

    await File.sequelize.query(
      `UPDATE files
       SET ocr_verified = TRUE,
           ocr_verified_at = NOW(),
           ocr_provider = :provider,
           ocr_result_json = CASE
             WHEN :resultJson IS NULL THEN NULL
             ELSE CAST(:resultJson AS jsonb)
           END
       WHERE id = :fileId`,
      {
        replacements: {
          fileId: fileRecord.id,
          provider: normalizedProvider,
          resultJson: normalizedResult,
        },
      },
    );

    return res.json({
      success: true,
      message: "OCR подтвержден",
      data: {
        fileId: fileRecord.id,
        ocrVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
