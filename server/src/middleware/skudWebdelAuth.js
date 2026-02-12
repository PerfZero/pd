import crypto from "crypto";
import { AppError } from "./errorHandler.js";
import { Setting } from "../models/index.js";

const parseBoolean = (value) => String(value || "").toLowerCase() === "true";

const normalizeIp = (ip) => {
  if (!ip) return "";
  const raw = String(ip).trim();
  if (raw.startsWith("::ffff:")) {
    return raw.slice(7);
  }
  return raw;
};

const parseIpAllowlist = (source) => {
  return source
    .split(",")
    .map((item) => normalizeIp(item))
    .filter(Boolean);
};

const parseBasicCredentials = (headerValue) => {
  if (!headerValue || !headerValue.startsWith("Basic ")) {
    return null;
  }

  const encoded = headerValue.slice("Basic ".length);
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) return null;

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
};

const safeEquals = (a, b) => {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const validateIpAllowlist = (req, source) => {
  const allowlist = parseIpAllowlist(source || "");
  if (allowlist.length === 0) return;

  const requestIp = normalizeIp(req.ip || req.connection?.remoteAddress);
  if (!allowlist.includes(requestIp)) {
    throw new AppError("IP не разрешен для WebDel", 403);
  }
};

const validateBasicAuth = (req, configuredUsername, configuredPassword) => {
  const user = configuredUsername || "";
  const password = configuredPassword || "";

  if (!user && !password) {
    return;
  }

  const credentials = parseBasicCredentials(req.headers.authorization || "");
  if (!credentials) {
    throw new AppError("Неверные учетные данные WebDel", 401);
  }

  if (
    !safeEquals(credentials.username, user) ||
    !safeEquals(credentials.password, password)
  ) {
    throw new AppError("Неверные учетные данные WebDel", 401);
  }
};

const getWebdelRuntimeConfig = async () => {
  const [
    enabledSetting,
    ipAllowlistSetting,
    basicUserSetting,
    basicPasswordSetting,
  ] = await Promise.all([
    Setting.getSetting("skud_webdel_enabled"),
    Setting.getSetting("skud_webdel_ip_allowlist"),
    Setting.getSetting("skud_webdel_basic_user"),
    Setting.getSetting("skud_webdel_basic_password"),
  ]);

  return {
    enabled:
      enabledSetting === null
        ? parseBoolean(process.env.SKUD_WEBDEL_ENABLED || "false")
        : parseBoolean(enabledSetting),
    ipAllowlist:
      ipAllowlistSetting === null
        ? process.env.SKUD_WEBDEL_IP_ALLOWLIST || ""
        : ipAllowlistSetting,
    basicUser:
      basicUserSetting === null
        ? process.env.SKUD_WEBDEL_BASIC_USER || ""
        : basicUserSetting,
    basicPassword:
      basicPasswordSetting === null
        ? process.env.SKUD_WEBDEL_BASIC_PASSWORD || ""
        : basicPasswordSetting,
  };
};

export const authenticateSkudWebdel = (req, res, next) => {
  (async () => {
    const config = await getWebdelRuntimeConfig();

    if (!config.enabled) {
      throw new AppError("Интеграция WebDel отключена", 503);
    }

    validateIpAllowlist(req, config.ipAllowlist);
    validateBasicAuth(req, config.basicUser, config.basicPassword);
  })()
    .then(() => next())
    .catch((error) => {
      next(error);
    });
};
