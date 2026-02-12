import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptFileBuffer,
  encryptFileBuffer,
  isSensitiveDocumentType,
  shouldEncryptFile,
  validateFileEncryptionConfig,
} from "./fileEncryptionService.js";

const withEnv = (values, fn) => {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

const TEST_KEYS_JSON = JSON.stringify({
  v1: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
});

test("file encryption service should encrypt/decrypt file buffer", () =>
  withEnv(
    {
      FILE_ENCRYPTION_ENABLED: "true",
      APP_FILE_ENCRYPTION_ACTIVE_KEY_VERSION: "v1",
      APP_FILE_ENCRYPTION_KEYS: TEST_KEYS_JSON,
      APP_FIELD_ENCRYPTION_ACTIVE_KEY_VERSION: undefined,
      APP_FIELD_ENCRYPTION_KEYS: undefined,
      FILE_ENCRYPTION_SENSITIVE_DOC_TYPES: "passport,kig,patent_front",
    },
    () => {
      const enabled = validateFileEncryptionConfig();
      assert.equal(enabled, true);
      assert.equal(isSensitiveDocumentType("passport"), true);
      assert.equal(isSensitiveDocumentType("other"), false);
      assert.equal(shouldEncryptFile({ documentType: "passport" }), true);

      const original = Buffer.from("fake-binary-content-123", "utf8");
      const encrypted = encryptFileBuffer(original, {
        documentType: "passport",
      });
      assert.equal(encrypted.metadata.isEncrypted, true);
      assert.notEqual(
        encrypted.encryptedBuffer.toString("base64"),
        original.toString("base64"),
      );

      const decrypted = decryptFileBuffer(encrypted.encryptedBuffer, {
        ...encrypted.metadata,
        documentType: "passport",
      });
      assert.deepEqual(decrypted, original);
    },
  ));
