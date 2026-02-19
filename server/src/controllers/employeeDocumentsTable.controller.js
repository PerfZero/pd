import axios from "axios";
import archiver from "archiver";
import * as XLSX from "xlsx";
import { QueryTypes } from "sequelize";
import {
  sequelize,
  CounterpartySubcounterpartyMapping,
  Setting,
} from "../models/index.js";
import storageProvider from "../config/storage.js";
import { AppError } from "../middleware/errorHandler.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_EXPORT_ROWS = 10000;
const EXPIRY_SOON_DAYS = 30;

const DOCUMENT_STATUSES = new Set([
  "uploaded",
  "not_uploaded",
  "ocr_verified",
  "expiring",
]);

const STATUS_LABELS = {
  uploaded: "Загружен",
  not_uploaded: "Не загружен",
  ocr_verified: "Проверен OCR",
  expiring: "Срок истекает",
};

let hasDocumentTypeRequiredColumnCache = null;

const sanitizeZipSegment = (value) =>
  String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "Без_названия";

const normalizePositiveInt = (value, fallback) => {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split("T")[0];
};

const normalizeSearch = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeIdList = (value) => {
  if (!value) return [];

  const raw = Array.isArray(value) ? value : String(value).split(",");
  return [
    ...new Set(raw.map((item) => String(item || "").trim()).filter(Boolean)),
  ];
};

const getAllowedCounterpartyIds = async (user) => {
  if (user.role === "admin" || user.role === "manager") {
    return null;
  }

  if (user.role !== "user") {
    throw new AppError("Недостаточно прав", 403);
  }

  const defaultCounterpartyId = await Setting.getSetting(
    "default_counterparty_id",
  );
  if (!defaultCounterpartyId) {
    return [user.counterpartyId];
  }

  if (user.counterpartyId === defaultCounterpartyId) {
    return [user.counterpartyId];
  }

  const subcontractors = await CounterpartySubcounterpartyMapping.findAll({
    where: { parentCounterpartyId: user.counterpartyId },
    attributes: ["childCounterpartyId"],
  });

  return [
    user.counterpartyId,
    ...subcontractors.map((item) => item.childCounterpartyId),
  ];
};

const hasDocumentTypeRequiredColumn = async () => {
  if (hasDocumentTypeRequiredColumnCache !== null) {
    return hasDocumentTypeRequiredColumnCache;
  }

  const rows = await sequelize.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'document_types'
          AND column_name = 'is_required'
      ) AS exists
    `,
    { type: QueryTypes.SELECT },
  );

  hasDocumentTypeRequiredColumnCache = Boolean(rows?.[0]?.exists);
  return hasDocumentTypeRequiredColumnCache;
};

const buildDocumentCte = async ({ user, filters }) => {
  const replacements = {
    expiringDays: EXPIRY_SOON_DAYS,
  };
  const hasRequiredColumn = await hasDocumentTypeRequiredColumn();

  const allowedCounterpartyIds = await getAllowedCounterpartyIds(user);
  if (allowedCounterpartyIds && allowedCounterpartyIds.length === 0) {
    return { cte: "", replacements, statusWhere: [], empty: true };
  }

  const employeeWhere = ["e.is_deleted = FALSE"];
  if (allowedCounterpartyIds) {
    employeeWhere.push("ecm.counterparty_id IN (:allowedCounterpartyIds)");
    replacements.allowedCounterpartyIds = allowedCounterpartyIds;
  }

  if (filters.counterpartyId) {
    if (
      allowedCounterpartyIds &&
      !allowedCounterpartyIds.includes(filters.counterpartyId)
    ) {
      throw new AppError("Нет доступа к выбранному контрагенту", 403);
    }
    employeeWhere.push("ecm.counterparty_id = :counterpartyId");
    replacements.counterpartyId = filters.counterpartyId;
  }

  if (filters.employeeSearch) {
    employeeWhere.push(`(
      e.last_name ILIKE :employeeSearch
      OR e.first_name ILIKE :employeeSearch
      OR e.middle_name ILIKE :employeeSearch
      OR CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name) ILIKE :employeeSearch
    )`);
    replacements.employeeSearch = `%${filters.employeeSearch}%`;
  }

  if (Array.isArray(filters.employeeIds) && filters.employeeIds.length > 0) {
    employeeWhere.push("e.id IN (:employeeIds)");
    replacements.employeeIds = filters.employeeIds;
  }

  const documentWhere = ["dt.is_active = TRUE"];
  if (filters.documentType) {
    documentWhere.push("dt.code = :documentType");
    replacements.documentType = filters.documentType;
  }

  const statusWhere = [];
  if (filters.status) {
    statusWhere.push("bd.doc_status = :status");
    replacements.status = filters.status;
  }

  const expiryDateSql = `CASE
      WHEN dt.code = 'passport' THEN fe.passport_expiry_date::date
      WHEN dt.code = 'kig' THEN fe.kig_end_date::date
      WHEN dt.code IN ('patent_front', 'patent_back', 'patent_payment_receipt')
        AND fe.patent_issue_date IS NOT NULL
      THEN (fe.patent_issue_date + INTERVAL '1 year')::date
      ELSE NULL
    END`;

  const cte = `
    WITH filtered_employees AS (
      SELECT DISTINCT
        e.id AS employee_id,
        e.last_name,
        e.first_name,
        e.middle_name,
        e.passport_number,
        e.passport_date,
        e.passport_expiry_date,
        e.kig,
        e.kig_end_date,
        e.patent_number,
        e.patent_issue_date,
        e.blank_number,
        c.id AS counterparty_id,
        c.name AS counterparty_name
      FROM employees e
      INNER JOIN employee_counterparty_mapping ecm
        ON ecm.employee_id = e.id
      INNER JOIN counterparties c
        ON c.id = ecm.counterparty_id
      WHERE ${employeeWhere.join(" AND ")}
    ),
    base_raw AS (
      SELECT
        fe.employee_id,
        fe.counterparty_id,
        fe.counterparty_name,
        fe.last_name,
        fe.first_name,
        fe.middle_name,
        TRIM(CONCAT_WS(' ', fe.last_name, fe.first_name, fe.middle_name)) AS employee_full_name,
        dt.id AS document_type_id,
        dt.code AS document_type_code,
        dt.name AS document_type_name,
        ${hasRequiredColumn ? "dt.is_required" : "FALSE"} AS document_type_required,
        CASE
          WHEN dt.code = 'passport' THEN fe.passport_number
          WHEN dt.code IN ('patent_front', 'patent_back', 'patent_payment_receipt') THEN fe.patent_number
          WHEN dt.code = 'kig' THEN fe.kig
          WHEN dt.code = 'visa' THEN fe.blank_number
          ELSE NULL
        END AS series_number,
        CASE
          WHEN dt.code = 'passport' THEN fe.passport_date::date
          WHEN dt.code IN ('patent_front', 'patent_back', 'patent_payment_receipt') THEN fe.patent_issue_date::date
          ELSE NULL
        END AS issue_date,
        ${expiryDateSql} AS expiry_date,
        lf.id AS file_id,
        lf.file_name,
        lf.original_name,
        lf.file_path,
        lf.mime_type,
        lf.created_at AS uploaded_at,
        COALESCE(lf.ocr_verified, FALSE) AS ocr_verified
      FROM filtered_employees fe
      CROSS JOIN document_types dt
      LEFT JOIN LATERAL (
        SELECT
          f.id,
          f.file_name,
          f.original_name,
          f.file_path,
          f.mime_type,
          f.created_at,
          COALESCE(f.ocr_verified, FALSE) AS ocr_verified
        FROM files f
        WHERE f.employee_id = fe.employee_id
          AND f.entity_type = 'employee'
          AND f.is_deleted = FALSE
          AND f.document_type::text = dt.code
        ORDER BY f.created_at DESC
        LIMIT 1
      ) lf ON TRUE
      WHERE ${documentWhere.join(" AND ")}
    ),
    base_data AS (
      SELECT
        br.*,
        CASE
          WHEN br.file_id IS NULL OR br.file_path IS NULL OR br.file_path = '' THEN 'not_uploaded'
          WHEN br.expiry_date IS NOT NULL
            AND br.expiry_date <= (CURRENT_DATE + (:expiringDays || ' days')::interval)::date
            THEN 'expiring'
          WHEN br.ocr_verified THEN 'ocr_verified'
          ELSE 'uploaded'
        END AS doc_status
      FROM base_raw br
    )
  `;

  return { cte, replacements, statusWhere, empty: false };
};

const mapRow = (row) => ({
  employeeId: row.employee_id,
  counterpartyId: row.counterparty_id,
  counterpartyName: row.counterparty_name,
  employeeFullName: row.employee_full_name,
  documentTypeId: row.document_type_id,
  documentType: row.document_type_code,
  documentTypeName: row.document_type_name,
  isRequired: Boolean(row.document_type_required),
  seriesNumber: row.series_number || null,
  issueDate: normalizeDate(row.issue_date),
  expiryDate: normalizeDate(row.expiry_date),
  status: row.doc_status,
  statusLabel: STATUS_LABELS[row.doc_status] || row.doc_status,
  fileId: row.file_id || null,
  fileName: row.file_name || null,
  originalName: row.original_name || null,
  filePath: row.file_path || null,
  mimeType: row.mime_type || null,
  uploadedAt: row.uploaded_at || null,
  ocrVerified: Boolean(row.ocr_verified),
});

const fetchDocumentRows = async ({ req, withPagination }) => {
  const filters = {
    counterpartyId: normalizeSearch(req.query.counterpartyId),
    documentType: normalizeSearch(req.query.documentType),
    status: normalizeSearch(req.query.status),
    employeeSearch: normalizeSearch(req.query.employeeSearch),
    employeeIds: normalizeIdList(req.query.employeeIds),
  };

  if (filters.status && !DOCUMENT_STATUSES.has(filters.status)) {
    throw new AppError("Неверный статус документа", 400);
  }

  const page = normalizePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedLimit = normalizePositiveInt(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(
    requestedLimit,
    withPagination ? MAX_LIMIT : MAX_EXPORT_ROWS,
  );
  const offset = (page - 1) * limit;

  const queryContext = await buildDocumentCte({ user: req.user, filters });
  if (queryContext.empty) {
    return {
      rows: [],
      total: 0,
      page,
      limit,
      filters,
    };
  }

  const { cte, replacements, statusWhere } = queryContext;
  const statusClause =
    statusWhere.length > 0 ? `WHERE ${statusWhere.join(" AND ")}` : "";

  const rowsQuery = `
    ${cte}
    SELECT *
    FROM base_data bd
    ${statusClause}
    ORDER BY bd.employee_full_name ASC, bd.document_type_name ASC
    ${withPagination ? "LIMIT :limit OFFSET :offset" : ""}
  `;

  const countQuery = `
    ${cte}
    SELECT COUNT(*)::int AS total
    FROM base_data bd
    ${statusClause}
  `;

  const rowReplacements = withPagination
    ? { ...replacements, limit, offset }
    : replacements;

  const [rawRows, countRows] = await Promise.all([
    sequelize.query(rowsQuery, {
      replacements: rowReplacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(countQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
  ]);

  const total = Number(countRows?.[0]?.total || 0);
  return {
    rows: rawRows.map(mapRow),
    total,
    page,
    limit,
    filters,
  };
};

export const getCounterpartyDocumentsTable = async (req, res, next) => {
  try {
    const result = await fetchDocumentRows({ req, withPagination: true });

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportCounterpartyDocumentsExcel = async (req, res, next) => {
  try {
    const result = await fetchDocumentRows({ req, withPagination: false });
    const rows = result.rows.slice(0, MAX_EXPORT_ROWS);

    const worksheetRows = rows.map((item, index) => ({
      "№": index + 1,
      Контрагент: item.counterpartyName || "-",
      Сотрудник: item.employeeFullName || "-",
      "Тип документа": item.documentTypeName || item.documentType,
      "Серия/Номер": item.seriesNumber || "-",
      "Дата выдачи": item.issueDate || "-",
      "Срок действия": item.expiryDate || "-",
      Статус: item.statusLabel,
      "Проверен OCR": item.ocrVerified ? "Да" : "Нет",
      "Обязательный тип": item.isRequired ? "Да" : "Нет",
      "Файл загружен": item.fileId ? "Да" : "Нет",
      "Имя файла": item.fileName || "-",
      "Дата загрузки": item.uploadedAt
        ? new Date(item.uploadedAt).toISOString()
        : "-",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Документы");
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `counterparty_documents_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

export const downloadCounterpartyDocumentsZip = async (req, res, next) => {
  try {
    const result = await fetchDocumentRows({ req, withPagination: false });
    const uploadedRows = result.rows
      .filter((item) => item.fileId && item.filePath)
      .slice(0, MAX_EXPORT_ROWS);

    if (uploadedRows.length === 0) {
      throw new AppError("Нет загруженных документов для выгрузки", 400);
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      if (!res.headersSent) {
        next(error);
      }
    });

    const fileName = `counterparty_documents_${new Date().toISOString().split("T")[0]}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    archive.pipe(res);

    for (const row of uploadedRows) {
      try {
        const downloadData = await storageProvider.getDownloadUrl(
          row.filePath,
          {
            expiresIn: 3600,
            fileName: row.originalName || row.fileName,
          },
        );
        const fileResponse = await axios.get(downloadData.url, {
          responseType: "stream",
          timeout: 45000,
        });

        const fileLabel = sanitizeZipSegment(
          row.originalName || row.fileName || `${row.fileId}.bin`,
        );
        const entryName = `${sanitizeZipSegment(row.counterpartyName)}/${sanitizeZipSegment(row.employeeFullName)}/${sanitizeZipSegment(row.documentTypeName)}_${fileLabel}`;
        archive.append(fileResponse.data, { name: entryName });
      } catch (error) {
        console.error(`Error adding file ${row.fileId} to zip:`, error.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};
