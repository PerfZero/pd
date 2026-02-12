import axios from "axios";
import { Setting } from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";

const SKUD_SETTINGS_META = {
  webdelEnabled: {
    key: "skud_webdel_enabled",
    type: "boolean",
    defaultValue: false,
    description: "Включена ли интеграция WebDel",
  },
  webdelBaseUrl: {
    key: "skud_webdel_base_url",
    type: "string",
    defaultValue: "",
    description: "Base URL для WebDel/Sigur",
  },
  webdelBasicUser: {
    key: "skud_webdel_basic_user",
    type: "string",
    defaultValue: "",
    description: "Логин Basic Auth для WebDel",
  },
  webdelBasicPassword: {
    key: "skud_webdel_basic_password",
    type: "string",
    defaultValue: "",
    description: "Пароль Basic Auth для WebDel",
    secret: true,
  },
  webdelIpAllowlist: {
    key: "skud_webdel_ip_allowlist",
    type: "string",
    defaultValue: "",
    description: "Список разрешенных IP для WebDel",
  },
  integrationMode: {
    key: "skud_integration_mode",
    type: "enum",
    enumValues: ["mock", "webdel", "sigur_rest"],
    defaultValue: "webdel",
    description: "Режим интеграции СКУД",
  },
  featureQrEnabled: {
    key: "skud_feature_qr_enabled",
    type: "boolean",
    defaultValue: true,
    description: "Включен ли функционал QR",
  },
  featureCardsEnabled: {
    key: "skud_feature_cards_enabled",
    type: "boolean",
    defaultValue: true,
    description: "Включен ли функционал карт",
  },
  featureSigurRestEnabled: {
    key: "skud_feature_sigur_rest_enabled",
    type: "boolean",
    defaultValue: false,
    description: "Включен ли прямой Sigur REST API",
  },
};

const parseBoolean = (value) => String(value).toLowerCase() === "true";

const parseSettingValue = (meta, rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return meta.defaultValue;
  }

  if (meta.type === "boolean") {
    return parseBoolean(rawValue);
  }

  if (meta.type === "enum") {
    const value = String(rawValue);
    if (meta.enumValues.includes(value)) {
      return value;
    }
    return meta.defaultValue;
  }

  return String(rawValue);
};

const serializeSettingValue = (meta, value) => {
  if (meta.type === "boolean") {
    return value ? "true" : "false";
  }
  return String(value ?? "");
};

const validatePatchValue = (meta, value, fieldName) => {
  if (meta.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new AppError(`${fieldName} должен быть boolean`, 400);
    }
    return;
  }

  if (meta.type === "enum") {
    if (!meta.enumValues.includes(value)) {
      throw new AppError(
        `${fieldName} должен быть одним из: ${meta.enumValues.join(", ")}`,
        400,
      );
    }
    return;
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName} должен быть строкой`, 400);
  }

  if (fieldName === "webdelBaseUrl" && value.trim()) {
    try {
      const parsed = new URL(value.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new AppError("webdelBaseUrl должен быть корректным URL", 400);
    }
  }
};

const loadSettingsMap = async () => {
  const keys = Object.values(SKUD_SETTINGS_META).map((item) => item.key);
  const rows = await Setting.findAll({
    where: {
      key: keys,
    },
  });

  return new Map(rows.map((row) => [row.key, row.value]));
};

export const getSkudSettings = async ({ includeSecrets = false } = {}) => {
  const settingMap = await loadSettingsMap();
  const result = {};

  Object.entries(SKUD_SETTINGS_META).forEach(([field, meta]) => {
    const rawValue = settingMap.get(meta.key);
    const parsed = parseSettingValue(meta, rawValue);

    if (meta.secret && !includeSecrets) {
      result[field] = parsed ? "********" : "";
      result[`${field}Configured`] = Boolean(parsed);
    } else {
      result[field] = parsed;
    }
  });

  return result;
};

export const updateSkudSettings = async (patch = {}) => {
  const allowedFields = new Set(Object.keys(SKUD_SETTINGS_META));
  const patchEntries = Object.entries(patch).filter(
    ([key, value]) => allowedFields.has(key) && value !== undefined,
  );

  if (patchEntries.length === 0) {
    throw new AppError("Нет данных для обновления", 400);
  }

  for (const [field, value] of patchEntries) {
    const meta = SKUD_SETTINGS_META[field];
    validatePatchValue(meta, value, field);
    await Setting.setSetting(meta.key, serializeSettingValue(meta, value), meta.description);
  }

  return getSkudSettings();
};

const mergeSettingsWithOverride = (current, override = {}) => {
  const merged = { ...current };
  Object.entries(SKUD_SETTINGS_META).forEach(([field, meta]) => {
    if (!(field in override)) return;
    validatePatchValue(meta, override[field], field);
    merged[field] = override[field];
  });
  return merged;
};

export const checkSkudSettingsConnection = async (override = {}) => {
  const settings = await getSkudSettings({ includeSecrets: true });
  const effective = mergeSettingsWithOverride(settings, override);
  const baseUrl = (effective.webdelBaseUrl || "").trim();

  if (!baseUrl) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      message: "webdelBaseUrl не задан",
      effective: {
        integrationMode: effective.integrationMode,
        webdelEnabled: effective.webdelEnabled,
      },
    };
  }

  try {
    const parsed = new URL(baseUrl);
    const timeoutMs = 5000;
    const auth =
      effective.webdelBasicUser && effective.webdelBasicPassword
        ? {
            username: effective.webdelBasicUser,
            password: effective.webdelBasicPassword,
          }
        : undefined;

    const response = await axios.get(parsed.toString(), {
      timeout: timeoutMs,
      auth,
      validateStatus: () => true,
    });

    const status = Number(response.status) || 0;
    const ok = status > 0 && status < 500;

    return {
      ok,
      checkedAt: new Date().toISOString(),
      status,
      message: ok
        ? "Подключение установлено"
        : "Сервер вернул ошибку (>=500)",
      effective: {
        integrationMode: effective.integrationMode,
        webdelEnabled: effective.webdelEnabled,
      },
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      message:
        error?.code === "ECONNABORTED"
          ? "Таймаут подключения к WebDel"
          : `Ошибка подключения: ${error.message}`,
      effective: {
        integrationMode: effective.integrationMode,
        webdelEnabled: effective.webdelEnabled,
      },
    };
  }
};

export const getSkudSettingsMetaFields = () => Object.keys(SKUD_SETTINGS_META);
