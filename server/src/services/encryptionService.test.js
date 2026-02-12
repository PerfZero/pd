import test from "node:test";
import assert from "node:assert/strict";

import {
  ENCRYPTED_EMPLOYEE_FIELDS,
  decryptField,
  encryptField,
  hashForSearch,
  normalizeForHash,
  validateFieldEncryptionConfig,
} from "./encryptionService.js";

const TEST_ENCRYPTION_KEYS =
  '{"v1":"MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="}';

const setValidEnv = () => {
  process.env.FIELD_ENCRYPTION_ENABLED = "true";
  process.env.APP_FIELD_ENCRYPTION_KEYS = TEST_ENCRYPTION_KEYS;
  process.env.APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION = "v1";
  process.env.APP_FIELD_HASH_PEPPER = "test-pepper-value-123";
};

const clearEnv = () => {
  delete process.env.FIELD_ENCRYPTION_ENABLED;
  delete process.env.APP_FIELD_ENCRYPTION_KEYS;
  delete process.env.APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION;
  delete process.env.APP_FIELD_HASH_PEPPER;
};

test("normalizeForHash should normalize last name and document numbers", () => {
  setValidEnv();

  const normalizedLastName = normalizeForHash(
    ENCRYPTED_EMPLOYEE_FIELDS.LAST_NAME,
    "  ИВАНОВ   ИВАНОВ  ",
  );
  const normalizedPassport = normalizeForHash(
    ENCRYPTED_EMPLOYEE_FIELDS.PASSPORT_NUMBER,
    " 40 15-123456 ",
  );

  assert.equal(normalizedLastName, "иванов иванов");
  assert.equal(normalizedPassport, "4015123456");
});

test("hashForSearch should produce stable hash for equivalent values", () => {
  setValidEnv();

  const hash1 = hashForSearch(
    ENCRYPTED_EMPLOYEE_FIELDS.PASSPORT_NUMBER,
    "40 15-123456",
  );
  const hash2 = hashForSearch(
    ENCRYPTED_EMPLOYEE_FIELDS.PASSPORT_NUMBER,
    "4015123456",
  );

  assert.equal(hash1, hash2);
});

test("hashForSearch should produce different hashes for different values", () => {
  setValidEnv();

  const hash1 = hashForSearch(ENCRYPTED_EMPLOYEE_FIELDS.KIG, "AB1234567");
  const hash2 = hashForSearch(ENCRYPTED_EMPLOYEE_FIELDS.KIG, "AB1234568");

  assert.notEqual(hash1, hash2);
});

test("encryptField/decryptField should return original value", () => {
  setValidEnv();

  const encrypted = encryptField("AB1234567");
  assert.ok(encrypted);
  assert.ok(encrypted.payload);
  assert.equal(encrypted.keyVersion, "v1");

  const decrypted = decryptField(encrypted.payload, encrypted.keyVersion);
  assert.equal(decrypted, "AB1234567");
});

test("encryptField should be non-deterministic due to random iv", () => {
  setValidEnv();

  const encrypted1 = encryptField("4015123456");
  const encrypted2 = encryptField("4015123456");

  assert.notEqual(encrypted1.payload, encrypted2.payload);
});

test("validateFieldEncryptionConfig should fail for invalid config", () => {
  clearEnv();
  process.env.FIELD_ENCRYPTION_ENABLED = "true";
  process.env.APP_FIELD_ENCRYPTION_KEYS = "{}";
  process.env.APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION = "v1";
  process.env.APP_FIELD_HASH_PEPPER = "short";

  assert.throws(() => validateFieldEncryptionConfig());
});

test("validateFieldEncryptionConfig should pass for valid config", () => {
  setValidEnv();
  assert.equal(validateFieldEncryptionConfig(), true);
});
