import axios from "axios";
import { AppError } from "../middleware/errorHandler.js";

const DEFAULT_MVD_API_URL = "https://api-cloud.ru/api/mvd.php";
const DEFAULT_MVD_TIMEOUT_MS = 120000;

const SUPPORTED_MVD_TYPES = {
  rkl: ["fio", "birthdate", "docnum", "docdate"],
  rklv2: ["birthdate", "docnum", "docdate"],
  patent: ["docseria", "docnumber", "blankseria", "blanknumber", "lbg"],
  patentv2: ["docseria", "docnumber", "blankseria", "blanknumber", "lbg"],
  wanted: ["lastname", "firstname", "birthdate"],
  chekpassportv2: ["seria", "nomer", "lastname", "firstname"],
};

const normalizeType = (value) => String(value || "").trim().toLowerCase();

const ensureMvdTypeSupported = (type) => {
  if (!SUPPORTED_MVD_TYPES[type]) {
    const supported = Object.keys(SUPPORTED_MVD_TYPES).join(", ");
    throw new AppError(
      `Неподдерживаемый MVD type: ${type}. Допустимые: ${supported}`,
      400,
    );
  }
};

const normalizeParams = (input = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) return;
    const normalizedValue = String(value).trim();
    if (!normalizedValue) return;
    output[normalizedKey] = normalizedValue;
  });
  return output;
};

const ensureMandatoryParams = (type, params) => {
  const missing = (SUPPORTED_MVD_TYPES[type] || []).filter(
    (key) => !params[key],
  );
  if (missing.length > 0) {
    throw new AppError(
      `Для type=${type} отсутствуют обязательные параметры: ${missing.join(", ")}`,
      400,
    );
  }
};

const resolveMvdConfig = () => {
  const token = String(process.env.MVD_API_TOKEN || "").trim();
  if (!token) {
    throw new AppError(
      "MVD интеграция не настроена: отсутствует MVD_API_TOKEN",
      503,
    );
  }

  const url = String(process.env.MVD_API_URL || DEFAULT_MVD_API_URL).trim();
  const configuredTimeout = Number(process.env.MVD_API_TIMEOUT_MS || 0);
  const timeoutMs = Math.max(
    Number.isFinite(configuredTimeout) ? configuredTimeout : 0,
    DEFAULT_MVD_TIMEOUT_MS,
  );

  return { token, url, timeoutMs };
};

const parseMvdResponse = (responseData) => {
  if (typeof responseData === "string") {
    try {
      return JSON.parse(responseData);
    } catch {
      return { raw: responseData };
    }
  }
  if (responseData && typeof responseData === "object") {
    return responseData;
  }
  return { raw: responseData };
};

export const checkMvd = async ({ type, params = {} }) => {
  const normalizedType = normalizeType(type);
  ensureMvdTypeSupported(normalizedType);

  const normalizedParams = normalizeParams(params);
  ensureMandatoryParams(normalizedType, normalizedParams);

  const config = resolveMvdConfig();

  try {
    const response = await axios.get(config.url, {
      params: {
        type: normalizedType,
        ...normalizedParams,
      },
      headers: {
        Token: config.token,
      },
      timeout: config.timeoutMs,
    });

    return {
      type: normalizedType,
      requestedAt: new Date().toISOString(),
      result: parseMvdResponse(response.data),
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `MVD provider error: ${error.response.status}`,
        error.response.status >= 500 ? 502 : 400,
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new AppError(
        "MVD provider timeout: не удалось получить ответ за отведенное время",
        504,
      );
    }
    throw new AppError("Ошибка вызова MVD provider", 502);
  }
};

export const getSupportedMvdTypes = () => {
  return Object.entries(SUPPORTED_MVD_TYPES).map(([type, requiredParams]) => ({
    type,
    requiredParams,
  }));
};
