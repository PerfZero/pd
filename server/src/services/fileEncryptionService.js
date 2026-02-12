import crypto from "crypto";

const FILE_ENCRYPTION_ALGORITHM = "aes-256-gcm";
const GCM_IV_BYTES = 12;
const DOCUMENT_TYPE_AAD_PREFIX = "docType:";
const DEFAULT_SENSITIVE_DOC_TYPES = Object.freeze([
  "passport",
  "kig",
  "patent_front",
  "patent_back",
  "application_scan",
]);

let cachedKeysConfig = null;
let cachedKeyVersion = null;

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
};

const parseKeyMap = (rawKeys) => {
  if (!rawKeys) {
    throw new Error(
      "FILE_ENCRYPTION is enabled but no keys configured. Set APP_FILE_ENCRYPTION_KEYS or APP_FIELD_ENCRYPTION_KEYS.",
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(rawKeys);
  } catch (error) {
    throw new Error("Invalid JSON in APP_FILE_ENCRYPTION_KEYS");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("APP_FILE_ENCRYPTION_KEYS must be an object");
  }

  const keyEntries = Object.entries(parsed);
  if (keyEntries.length === 0) {
    throw new Error("APP_FILE_ENCRYPTION_KEYS cannot be empty");
  }

  const keysByVersion = new Map();
  for (const [version, base64Key] of keyEntries) {
    if (!version || typeof version !== "string") {
      throw new Error("Key version must be a non-empty string");
    }
    if (typeof base64Key !== "string" || base64Key.trim() === "") {
      throw new Error(`Encryption key for version ${version} is empty`);
    }
    const keyBuffer = Buffer.from(base64Key, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error(
        `Encryption key for version ${version} must decode to 32 bytes`,
      );
    }
    keysByVersion.set(version, keyBuffer);
  }

  return keysByVersion;
};

const getActiveKeyVersion = () => {
  const keyVersion =
    process.env.APP_FILE_ENCRYPTION_ACTIVE_KEY_VERSION ||
    process.env.APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION;
  if (!keyVersion) {
    throw new Error(
      "APP_FILE_ENCRYPTION_ACTIVE_KEY_VERSION is required when FILE_ENCRYPTION is enabled",
    );
  }
  return keyVersion;
};

const loadKeysConfig = () => {
  const rawKeys =
    process.env.APP_FILE_ENCRYPTION_KEYS || process.env.APP_FIELD_ENCRYPTION_KEYS;
  const nextKeyVersion = getActiveKeyVersion();

  if (cachedKeysConfig && cachedKeyVersion === nextKeyVersion) {
    return cachedKeysConfig;
  }

  const keysByVersion = parseKeyMap(rawKeys);
  if (!keysByVersion.has(nextKeyVersion)) {
    throw new Error(
      `Active key version ${nextKeyVersion} is missing in APP_FILE_ENCRYPTION_KEYS`,
    );
  }

  cachedKeysConfig = keysByVersion;
  cachedKeyVersion = nextKeyVersion;
  return cachedKeysConfig;
};

const getAadBuffer = (documentType) =>
  Buffer.from(`${DOCUMENT_TYPE_AAD_PREFIX}${documentType || "unknown"}`, "utf8");

export const isFileEncryptionEnabled = () =>
  parseBoolean(process.env.FILE_ENCRYPTION_ENABLED, false);

export const getSensitiveDocumentTypes = () => {
  const raw = process.env.FILE_ENCRYPTION_SENSITIVE_DOC_TYPES;
  if (!raw) {
    return DEFAULT_SENSITIVE_DOC_TYPES;
  }
  const parsed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_SENSITIVE_DOC_TYPES;
};

export const isSensitiveDocumentType = (documentType) => {
  if (!documentType) {
    return false;
  }
  const normalized = String(documentType).trim().toLowerCase();
  return getSensitiveDocumentTypes().includes(normalized);
};

export const shouldEncryptFile = ({ documentType }) =>
  isFileEncryptionEnabled() && isSensitiveDocumentType(documentType);

export const validateFileEncryptionConfig = () => {
  if (!isFileEncryptionEnabled()) {
    return false;
  }

  const keyVersion = getActiveKeyVersion();
  const keysByVersion = loadKeysConfig();

  if (!keysByVersion.has(keyVersion)) {
    throw new Error(
      `Active key version ${keyVersion} not found in file encryption keys`,
    );
  }

  return true;
};

const getFileKeyByVersion = (keyVersion) => {
  const keysByVersion = loadKeysConfig();
  const key = keysByVersion.get(keyVersion);
  if (!key) {
    throw new Error(`Unknown file encryption key version: ${keyVersion}`);
  }
  return key;
};

export const encryptFileBuffer = (fileBuffer, { documentType } = {}) => {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error("encryptFileBuffer expects a Buffer");
  }

  const keyVersion = getActiveKeyVersion();
  const key = getFileKeyByVersion(keyVersion);
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv(FILE_ENCRYPTION_ALGORITHM, key, iv);
  cipher.setAAD(getAadBuffer(documentType));

  const encryptedBuffer = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedBuffer,
    metadata: {
      isEncrypted: true,
      encryptionAlgorithm: FILE_ENCRYPTION_ALGORITHM,
      encryptionKeyVersion: keyVersion,
      encryptionIv: iv.toString("base64"),
      encryptionTag: authTag.toString("base64"),
    },
  };
};

export const decryptFileBuffer = (
  encryptedBuffer,
  { encryptionAlgorithm, encryptionKeyVersion, encryptionIv, encryptionTag, documentType } = {},
) => {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new Error("decryptFileBuffer expects a Buffer");
  }

  if (!encryptionAlgorithm || encryptionAlgorithm !== FILE_ENCRYPTION_ALGORITHM) {
    throw new Error("Unsupported file encryption algorithm");
  }
  if (!encryptionKeyVersion || !encryptionIv || !encryptionTag) {
    throw new Error("Incomplete file encryption metadata");
  }

  const key = getFileKeyByVersion(encryptionKeyVersion);
  const iv = Buffer.from(encryptionIv, "base64");
  const authTag = Buffer.from(encryptionTag, "base64");
  const decipher = crypto.createDecipheriv(FILE_ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAAD(getAadBuffer(documentType));
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};
