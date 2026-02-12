import crypto from "crypto";

export const ENCRYPTED_EMPLOYEE_FIELDS = Object.freeze({
  LAST_NAME: "last_name",
  PASSPORT_NUMBER: "passport_number",
  KIG: "kig",
  PATENT_NUMBER: "patent_number",
});

const SUPPORTED_FIELDS = new Set(Object.values(ENCRYPTED_EMPLOYEE_FIELDS));
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_ALGORITHM_LABEL = "AES-256-GCM";
const GCM_IV_LENGTH = 12;

const isEnabled = () =>
  String(process.env.FIELD_ENCRYPTION_ENABLED || "false").toLowerCase() ===
  "true";

const toUtf8String = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const asString = String(value);
  return asString.length > 0 ? asString : null;
};

const normalizeText = (value) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");

const normalizeDocNumber = (value) =>
  normalizeText(value).toUpperCase().replace(/[^0-9A-Z]/g, "");

const normalizeByField = (field, value) => {
  const input = toUtf8String(value);
  if (input === null) {
    return null;
  }

  if (!SUPPORTED_FIELDS.has(field)) {
    throw new Error(`Unsupported encrypted field: ${field}`);
  }

  if (field === ENCRYPTED_EMPLOYEE_FIELDS.LAST_NAME) {
    const normalized = normalizeText(input).toLowerCase();
    return normalized || null;
  }

  const normalized = normalizeDocNumber(input);
  return normalized || null;
};

const getEncryptionConfig = ({ strict = false } = {}) => {
  const enabled = isEnabled();
  if (!enabled) {
    if (strict) {
      throw new Error(
        "Field encryption is disabled (FIELD_ENCRYPTION_ENABLED=false)",
      );
    }
    return null;
  }

  const rawKeys = process.env.APP_FIELD_ENCRYPTION_KEYS;
  const activeKeyVersion = process.env.APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION;
  const hashPepper = process.env.APP_FIELD_HASH_PEPPER;

  if (!rawKeys) {
    throw new Error("APP_FIELD_ENCRYPTION_KEYS is required");
  }

  if (!activeKeyVersion) {
    throw new Error("APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION is required");
  }

  if (!hashPepper || hashPepper.length < 16) {
    throw new Error("APP_FIELD_HASH_PEPPER must be at least 16 characters");
  }

  let parsedKeys;
  try {
    parsedKeys = JSON.parse(rawKeys);
  } catch (error) {
    throw new Error("APP_FIELD_ENCRYPTION_KEYS must be a valid JSON object");
  }

  if (!parsedKeys || typeof parsedKeys !== "object") {
    throw new Error("APP_FIELD_ENCRYPTION_KEYS must be a JSON object");
  }

  const keyMap = new Map();
  for (const [version, encodedKey] of Object.entries(parsedKeys)) {
    const key = Buffer.from(String(encodedKey || ""), "base64");
    if (key.length !== 32) {
      throw new Error(
        `Encryption key ${version} must be 32 bytes after base64 decode`,
      );
    }
    keyMap.set(version, key);
  }

  if (keyMap.size === 0) {
    throw new Error("APP_FIELD_ENCRYPTION_KEYS must contain at least one key");
  }

  if (!keyMap.has(activeKeyVersion)) {
    throw new Error(
      `Active key version ${activeKeyVersion} does not exist in APP_FIELD_ENCRYPTION_KEYS`,
    );
  }

  return {
    activeKeyVersion,
    keyMap,
    hashPepper,
  };
};

const toBase64 = (value) => Buffer.from(value).toString("base64");

const fromBase64 = (value) => Buffer.from(value, "base64");

const parseEnvelope = (encryptedPayload) => {
  if (!encryptedPayload) {
    return null;
  }

  let parsed = encryptedPayload;
  if (typeof encryptedPayload === "string") {
    try {
      parsed = JSON.parse(encryptedPayload);
    } catch (error) {
      throw new Error("Encrypted payload must be a valid JSON string");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Encrypted payload must be an object");
  }

  const { alg, iv, tag, ct } = parsed;
  if (
    alg !== ENCRYPTION_ALGORITHM_LABEL ||
    !iv ||
    !tag ||
    !ct ||
    typeof iv !== "string" ||
    typeof tag !== "string" ||
    typeof ct !== "string"
  ) {
    throw new Error("Encrypted payload envelope is invalid");
  }

  return parsed;
};

export const isFieldEncryptionEnabled = () => isEnabled();

export const validateFieldEncryptionConfig = () => {
  if (!isEnabled()) {
    return false;
  }

  getEncryptionConfig({ strict: true });
  return true;
};

export const normalizeForHash = (field, value) => normalizeByField(field, value);

export const hashForSearch = (field, value) => {
  const normalized = normalizeByField(field, value);
  if (!normalized) {
    return null;
  }

  const config = getEncryptionConfig({ strict: true });
  return crypto
    .createHmac("sha256", config.hashPepper)
    .update(`${field}:${normalized}`, "utf8")
    .digest("hex");
};

export const encryptField = (value) => {
  const plaintext = toUtf8String(value);
  if (plaintext === null) {
    return null;
  }

  const config = getEncryptionConfig({ strict: true });
  const key = config.keyMap.get(config.activeKeyVersion);
  const iv = crypto.randomBytes(GCM_IV_LENGTH);

  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    payload: JSON.stringify({
      alg: ENCRYPTION_ALGORITHM_LABEL,
      iv: toBase64(iv),
      tag: toBase64(authTag),
      ct: toBase64(ciphertext),
    }),
    keyVersion: config.activeKeyVersion,
  };
};

export const decryptField = (encryptedPayload, keyVersion) => {
  if (!encryptedPayload) {
    return null;
  }

  if (!keyVersion) {
    throw new Error("keyVersion is required to decrypt field");
  }

  const config = getEncryptionConfig({ strict: true });
  const key = config.keyMap.get(keyVersion);
  if (!key) {
    throw new Error(`Encryption key not found for version ${keyVersion}`);
  }

  const envelope = parseEnvelope(encryptedPayload);
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    fromBase64(envelope.iv),
  );
  decipher.setAuthTag(fromBase64(envelope.tag));

  const plaintext = Buffer.concat([
    decipher.update(fromBase64(envelope.ct)),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
};
