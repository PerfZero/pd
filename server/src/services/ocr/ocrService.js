import axios from "axios";
import { AppError } from "../../middleware/errorHandler.js";

const DEFAULT_OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "qwen/qwen3-vl-30b-a3b-instruct";
const DEFAULT_PASSPORT_RF_PROMPT =
  "Распознай текст на изображении паспорта РФ. Верни строго JSON без обрамления. " +
  "Поля: surname, givenNames, middleName, birthDate, sex, nationality, " +
  "passportNumber, issueDate, departmentCode, authority, birthPlace, expiryDate.";
const DEFAULT_FOREIGN_PASSPORT_PROMPT =
  "Распознай текст на изображении паспорта иностранного гражданина. " +
  "Верни строго JSON без обрамления. Поля: surname, givenNames, middleName, " +
  "birthDate, sex, nationality, passportNumber, issueDate, expiryDate, authority, birthPlace.";
const DEFAULT_PATENT_PROMPT =
  "Распознай текст на изображении патента на работу. Верни строго JSON без обрамления. " +
  "Поля: patentNumber, issueDate, expiryDate, region, authority, surname, givenNames, middleName, birthDate, nationality.";
const DEFAULT_VISA_PROMPT =
  "Распознай текст на изображении визы. Верни строго JSON без обрамления. " +
  "Поля: visaNumber, issueDate, expiryDate, visaType, entries, surname, givenNames, nationality, birthDate.";
const DEFAULT_KIG_PROMPT =
  "Распознай текст на изображении карты иностранного гражданина (КИГ). " +
  "Верни строго JSON без обрамления. Поля: kigNumber, expiryDate, surname, givenNames, middleName, birthDate, nationality.";

const SUPPORTED_DOCUMENT_TYPES = new Set([
  "passport_rf",
  "passport",
  "foreign_passport",
  "patent",
  "visa",
  "kig",
]);
const MALE_VALUES = new Set(["m", "male", "м", "муж", "мужской"]);
const FEMALE_VALUES = new Set(["f", "female", "ж", "жен", "женский"]);

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
};

const normalizeDocumentType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "passport") {
    return "passport_rf";
  }
  if (
    normalized === "passport_foreign" ||
    normalized === "foreign-passport" ||
    normalized === "foreignpassport"
  ) {
    return "foreign_passport";
  }
  if (normalized === "patent_front" || normalized === "patent_back") {
    return "patent";
  }
  return normalized;
};

const ensureOcrEnabled = () => {
  const enabled = parseBoolean(process.env.OCR_ENABLED, false);
  if (!enabled) {
    throw new AppError("OCR отключен в конфигурации сервера", 503);
  }
};

const ensureSupportedDocumentType = (documentType) => {
  if (!SUPPORTED_DOCUMENT_TYPES.has(documentType)) {
    throw new AppError(
      `Неподдерживаемый documentType: ${documentType}. Доступно: ${Array.from(SUPPORTED_DOCUMENT_TYPES).join(", ")}`,
      400,
    );
  }
};

const resolvePromptByDocumentType = (documentType, promptOverride) => {
  if (promptOverride) {
    return promptOverride;
  }

  const promptByType = {
    passport_rf:
      process.env.OCR_PASSPORT_RF_PROMPT || DEFAULT_PASSPORT_RF_PROMPT,
    foreign_passport:
      process.env.OCR_FOREIGN_PASSPORT_PROMPT ||
      DEFAULT_FOREIGN_PASSPORT_PROMPT,
    patent: process.env.OCR_PATENT_PROMPT || DEFAULT_PATENT_PROMPT,
    visa: process.env.OCR_VISA_PROMPT || DEFAULT_VISA_PROMPT,
    kig: process.env.OCR_KIG_PROMPT || DEFAULT_KIG_PROMPT,
  };

  return promptByType[documentType] || DEFAULT_PASSPORT_RF_PROMPT;
};

const getOcrConfig = () => {
  const provider = (process.env.OCR_PROVIDER || "openrouter")
    .trim()
    .toLowerCase();
  const apiKey = process.env.OCR_API_KEY || process.env.OCR_OPENROUTER_API_KEY;
  const endpoint =
    process.env.OCR_OPENROUTER_ENDPOINT || DEFAULT_OPENROUTER_ENDPOINT;
  const model = process.env.OCR_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const timeoutMs = Number(process.env.OCR_REQUEST_TIMEOUT_MS || 60000);
  const referer = process.env.OCR_OPENROUTER_HTTP_REFERER || "";
  const appTitle = process.env.OCR_OPENROUTER_APP_TITLE || "";

  if (provider !== "openrouter") {
    throw new AppError(`Неподдерживаемый OCR_PROVIDER: ${provider}`, 500);
  }
  if (!apiKey) {
    throw new AppError("На сервере не задан OCR_API_KEY", 500);
  }

  return {
    provider,
    apiKey,
    endpoint,
    model,
    timeoutMs,
    referer,
    appTitle,
  };
};

const buildOpenRouterPayload = ({ model, prompt, imageDataUrl }) => ({
  model,
  temperature: 0.2,
  max_tokens: 1200,
  messages: [
    {
      role: "system",
      content: "Ты ассистент, который извлекает данные из документов.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt || DEFAULT_PROMPT,
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl,
          },
        },
      ],
    },
  ],
});

const extractResponseContent = (responseData) => {
  const messageContent = responseData?.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  const textContent = responseData?.choices?.[0]?.text;
  return typeof textContent === "string" ? textContent : "";
};

const extractJsonText = (raw) => {
  if (!raw) return null;

  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return raw.slice(firstBrace, lastBrace + 1);
};

const parseStructuredJson = (content) => {
  const jsonText = extractJsonText(content);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const valueFrom = (obj, aliases = []) => {
  if (!obj || typeof obj !== "object") return null;
  for (const key of aliases) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const value = String(obj[key]).trim();
      if (value) return value;
    }
  }
  return null;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dotSeparated = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotSeparated) {
    const [, day, month, year] = dotSeparated;
    return `${year}-${month}-${day}`;
  }

  const slashSeparated = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashSeparated) {
    const [, day, month, year] = slashSeparated;
    return `${year}-${month}-${day}`;
  }

  return raw;
};

const normalizeSex = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (MALE_VALUES.has(normalized)) return "M";
  if (FEMALE_VALUES.has(normalized)) return "F";
  return value;
};

const normalizeCitizenship = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes("рос") || normalized.includes("рф")) {
    return "RUS";
  }
  if (normalized === "rus") {
    return "RUS";
  }
  return String(value).trim().toUpperCase();
};

const normalizeAlphaNumeric = (value, maxLength = 64) => {
  if (!value) return null;
  const normalized = String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, maxLength);
  return normalized || null;
};

const normalizeDigits = (value, maxLength = 64) => {
  if (!value) return null;
  const normalized = String(value).replace(/[^\d]/g, "").slice(0, maxLength);
  return normalized || null;
};

const splitPassportNumber = (combinedValue) => {
  if (!combinedValue) {
    return { series: null, number: null };
  }

  const digitsOnly = combinedValue.replace(/\D/g, "");
  if (digitsOnly.length > 0 && digitsOnly.length <= 6) {
    return {
      series: null,
      number: digitsOnly,
    };
  }
  if (digitsOnly.length >= 10) {
    return {
      series: digitsOnly.slice(0, 4),
      number: digitsOnly.slice(4, 10),
    };
  }

  const parts = combinedValue.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      series: parts[0].replace(/\D/g, "") || null,
      number: parts.slice(1).join("").replace(/\D/g, "") || null,
    };
  }

  return { series: null, number: digitsOnly || null };
};

const normalizePassportRf = (parsedJson = {}) => {
  const passportNumberCombined = valueFrom(parsedJson, [
    "passportNumber",
    "passport_number",
    "number",
    "seriesNumber",
    "series_number",
  ]);

  const explicitSeries = valueFrom(parsedJson, [
    "passportSeries",
    "passport_series",
    "series",
  ]);
  const explicitNumber = valueFrom(parsedJson, [
    "passportNumberOnly",
    "passport_number_only",
    "numberOnly",
    "number_only",
  ]);
  const split = splitPassportNumber(passportNumberCombined || "");

  return {
    lastName: valueFrom(parsedJson, ["surname", "lastName", "last_name"]),
    firstName: valueFrom(parsedJson, ["givenNames", "firstName", "first_name"]),
    middleName: valueFrom(parsedJson, [
      "middleName",
      "middle_name",
      "patronymic",
    ]),
    birthDate: normalizeDate(
      valueFrom(parsedJson, ["birthDate", "birth_date", "dateOfBirth"]),
    ),
    sex: normalizeSex(valueFrom(parsedJson, ["sex", "gender"])),
    citizenship: normalizeCitizenship(
      valueFrom(parsedJson, ["nationality", "citizenship"]),
    ),
    passportSeries:
      (explicitSeries || split.series || null)?.slice(0, 4) || null,
    passportNumber:
      (explicitNumber || split.number || null)?.slice(0, 6) || null,
    passportIssuedAt: normalizeDate(
      valueFrom(parsedJson, ["issueDate", "issue_date", "passportIssueDate"]),
    ),
    passportIssuedBy: valueFrom(parsedJson, [
      "authority",
      "issuedBy",
      "passportIssuedBy",
    ]),
    passportDepartmentCode: valueFrom(parsedJson, [
      "departmentCode",
      "department_code",
      "passportDepartmentCode",
    ]),
    birthPlace: valueFrom(parsedJson, ["birthPlace", "birth_place"]),
    passportExpiryDate: normalizeDate(
      valueFrom(parsedJson, [
        "expiryDate",
        "expiry_date",
        "passportExpiryDate",
      ]),
    ),
  };
};

const normalizeForeignPassport = (parsedJson = {}) => {
  const passportNumberCombined = valueFrom(parsedJson, [
    "passportNumber",
    "passport_number",
    "number",
    "documentNumber",
    "document_number",
  ]);

  return {
    lastName: valueFrom(parsedJson, ["surname", "lastName", "last_name"]),
    firstName: valueFrom(parsedJson, ["givenNames", "firstName", "first_name"]),
    middleName: valueFrom(parsedJson, [
      "middleName",
      "middle_name",
      "patronymic",
    ]),
    birthDate: normalizeDate(
      valueFrom(parsedJson, ["birthDate", "birth_date", "dateOfBirth"]),
    ),
    sex: normalizeSex(valueFrom(parsedJson, ["sex", "gender"])),
    citizenship: normalizeCitizenship(
      valueFrom(parsedJson, ["nationality", "citizenship"]),
    ),
    passportSeries: null,
    passportNumber: normalizeAlphaNumeric(passportNumberCombined, 16),
    passportIssuedAt: normalizeDate(
      valueFrom(parsedJson, ["issueDate", "issue_date", "passportIssueDate"]),
    ),
    passportIssuedBy: valueFrom(parsedJson, [
      "authority",
      "issuedBy",
      "passportIssuedBy",
    ]),
    passportDepartmentCode: valueFrom(parsedJson, [
      "departmentCode",
      "department_code",
      "passportDepartmentCode",
    ]),
    birthPlace: valueFrom(parsedJson, ["birthPlace", "birth_place"]),
    passportExpiryDate: normalizeDate(
      valueFrom(parsedJson, [
        "expiryDate",
        "expiry_date",
        "passportExpiryDate",
      ]),
    ),
  };
};

const normalizePatent = (parsedJson = {}) => {
  return {
    patentNumber: normalizeDigits(
      valueFrom(parsedJson, [
        "patentNumber",
        "patent_number",
        "number",
        "documentNumber",
      ]),
      12,
    ),
    patentIssueDate: normalizeDate(
      valueFrom(parsedJson, ["issueDate", "issue_date", "patentIssueDate"]),
    ),
    patentExpiryDate: normalizeDate(
      valueFrom(parsedJson, ["expiryDate", "expiry_date", "patentExpiryDate"]),
    ),
    patentRegion: valueFrom(parsedJson, ["region", "patentRegion"]),
    patentIssuedBy: valueFrom(parsedJson, ["authority", "issuedBy"]),
    lastName: valueFrom(parsedJson, ["surname", "lastName", "last_name"]),
    firstName: valueFrom(parsedJson, ["givenNames", "firstName", "first_name"]),
    middleName: valueFrom(parsedJson, [
      "middleName",
      "middle_name",
      "patronymic",
    ]),
    birthDate: normalizeDate(
      valueFrom(parsedJson, ["birthDate", "birth_date", "dateOfBirth"]),
    ),
    citizenship: normalizeCitizenship(
      valueFrom(parsedJson, ["nationality", "citizenship"]),
    ),
  };
};

const normalizeVisa = (parsedJson = {}) => {
  return {
    visaNumber: normalizeAlphaNumeric(
      valueFrom(parsedJson, [
        "visaNumber",
        "visa_number",
        "number",
        "documentNumber",
      ]),
      16,
    ),
    visaIssueDate: normalizeDate(
      valueFrom(parsedJson, ["issueDate", "issue_date", "visaIssueDate"]),
    ),
    visaExpiryDate: normalizeDate(
      valueFrom(parsedJson, ["expiryDate", "expiry_date", "visaExpiryDate"]),
    ),
    visaType: valueFrom(parsedJson, ["visaType", "type"]),
    visaEntries: valueFrom(parsedJson, [
      "entries",
      "entryCount",
      "entry_count",
    ]),
    lastName: valueFrom(parsedJson, ["surname", "lastName", "last_name"]),
    firstName: valueFrom(parsedJson, ["givenNames", "firstName", "first_name"]),
    birthDate: normalizeDate(
      valueFrom(parsedJson, ["birthDate", "birth_date", "dateOfBirth"]),
    ),
    citizenship: normalizeCitizenship(
      valueFrom(parsedJson, ["nationality", "citizenship"]),
    ),
  };
};

const normalizeKig = (parsedJson = {}) => {
  const rawKig = valueFrom(parsedJson, [
    "kigNumber",
    "kig_number",
    "kig",
    "number",
    "cardNumber",
  ]);
  const normalizedKig = normalizeAlphaNumeric(rawKig, 16);

  return {
    kigNumber: normalizedKig,
    kigExpiryDate: normalizeDate(
      valueFrom(parsedJson, ["expiryDate", "expiry_date", "kigExpiryDate"]),
    ),
    lastName: valueFrom(parsedJson, ["surname", "lastName", "last_name"]),
    firstName: valueFrom(parsedJson, ["givenNames", "firstName", "first_name"]),
    middleName: valueFrom(parsedJson, [
      "middleName",
      "middle_name",
      "patronymic",
    ]),
    birthDate: normalizeDate(
      valueFrom(parsedJson, ["birthDate", "birth_date", "dateOfBirth"]),
    ),
    citizenship: normalizeCitizenship(
      valueFrom(parsedJson, ["nationality", "citizenship"]),
    ),
  };
};

const normalizeByDocumentType = (documentType, parsedJson = {}) => {
  if (documentType === "passport_rf") {
    return normalizePassportRf(parsedJson);
  }
  if (documentType === "foreign_passport") {
    return normalizeForeignPassport(parsedJson);
  }
  if (documentType === "patent") {
    return normalizePatent(parsedJson);
  }
  if (documentType === "visa") {
    return normalizeVisa(parsedJson);
  }
  if (documentType === "kig") {
    return normalizeKig(parsedJson);
  }
  return normalizePassportRf(parsedJson);
};

const callOpenRouter = async ({
  imageDataUrl,
  modelOverride,
  promptOverride,
  documentType,
}) => {
  const config = getOcrConfig();
  const payload = buildOpenRouterPayload({
    model: modelOverride || config.model,
    prompt: resolvePromptByDocumentType(documentType, promptOverride),
    imageDataUrl,
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.referer) {
    headers["HTTP-Referer"] = config.referer;
  }
  if (config.appTitle) {
    headers["X-Title"] = config.appTitle;
  }

  try {
    const response = await axios.post(config.endpoint, payload, {
      headers,
      timeout: config.timeoutMs,
    });

    const data = response.data || {};
    const content = extractResponseContent(data);
    const parsedJson = parseStructuredJson(content);

    return {
      provider: "openrouter",
      model: payload.model,
      content,
      parsedJson,
      rawResponse: data,
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `OCR provider error: ${error.response.status}`,
        error.response.status >= 500 ? 502 : 400,
      );
    }
    throw new AppError("Ошибка вызова OCR provider", 502);
  }
};

export const recognizeDocument = async ({
  documentType,
  imageDataUrl,
  model,
  prompt,
}) => {
  ensureOcrEnabled();
  const normalizedType = normalizeDocumentType(documentType);
  ensureSupportedDocumentType(normalizedType);

  const providerResult = await callOpenRouter({
    imageDataUrl,
    modelOverride: model,
    promptOverride: prompt,
    documentType: normalizedType,
  });

  const normalized = normalizeByDocumentType(
    normalizedType,
    providerResult.parsedJson || {},
  );

  return {
    documentType: normalizedType,
    provider: providerResult.provider,
    model: providerResult.model,
    normalized,
    raw: {
      content: providerResult.content,
      json: providerResult.parsedJson,
    },
  };
};
