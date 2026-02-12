import test from "node:test";
import assert from "node:assert/strict";
import {
  issueFileProxyToken,
  verifyFileProxyToken,
} from "./fileDownloadTokenService.js";

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

test("file proxy token should issue and verify payload", () =>
  withEnv(
    {
      JWT_SECRET: "test_jwt_secret_test_jwt_secret_32chars",
      FILE_PROXY_TOKEN_TTL_SECONDS: "120",
    },
    () => {
      const token = issueFileProxyToken({
        fileId: "f-1",
        disposition: "inline",
      });
      const payload = verifyFileProxyToken(token);
      assert.equal(payload.fileId, "f-1");
      assert.equal(payload.disposition, "inline");
    },
  ));
