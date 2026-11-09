import assert from "node:assert/strict";
import { test } from "node:test";
import { hasGeminiKey, resolveGeminiApiKey } from "../src/lib/gemini-api-key.ts";
import { decryptGeminiKey, encryptGeminiKey } from "../src/lib/gemini-key-crypto.ts";

const secret = "78".repeat(32);

test("Gemini activates for a personal or shared key and stays unavailable without either", () => {
  assert.equal(hasGeminiKey(true, undefined), true);
  assert.equal(hasGeminiKey(false, "shared-key"), true);
  assert.equal(hasGeminiKey(false, undefined), false);
});

async function withGeminiEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("personal Gemini keys are encrypted with randomized authenticated ciphertext", () => {
  const apiKey = "sample-gemini-api-key-with-more-than-20-characters";
  const first = encryptGeminiKey(apiKey, secret, "user-1");
  const second = encryptGeminiKey(apiKey, secret, "user-1");

  assert.notEqual(first, second);
  assert.equal(first.includes(apiKey), false);
  assert.equal(decryptGeminiKey(first, secret, "user-1"), apiKey);
  assert.throws(() => decryptGeminiKey(first, secret, "user-2"));
});

test("encrypted Gemini keys reject a wrong secret and tampered ciphertext", () => {
  const encrypted = encryptGeminiKey("sample-gemini-api-key-with-more-than-20-characters", secret, "user-1");
  assert.throws(() => decryptGeminiKey(encrypted, "99".repeat(32), "user-1"));
  const parts = encrypted.split(".");
  parts[3] = Buffer.from("tampered-data").toString("base64url");
  assert.throws(() => decryptGeminiKey(parts.join("."), secret, "user-1"));
});

test("encryption requires a well-formed 32-byte hexadecimal secret", () => {
  assert.throws(() => encryptGeminiKey("sample-gemini-api-key", "too-short", "user-1"));
});

test("a saved personal Gemini key takes precedence over the shared server key", async () => {
  const personalKey = "personal-gemini-api-key-with-more-than-20-characters";
  await withGeminiEnvironment({
    GEMINI_USER_KEY_ENCRYPTION_SECRET: secret,
    GEMINI_API_KEY: "shared-gemini-api-key-with-more-than-20-characters",
  }, async () => {
    const result = await resolveGeminiApiKey({
      rpc: async () => ({ data: encryptGeminiKey(personalKey, secret, "user-1"), error: null }),
    }, "user-1");
    assert.deepEqual(result, { apiKey: personalKey, source: "personal" });
  });
});

test("Gemini resolution falls back to the shared key only when no personal key is saved", async () => {
  await withGeminiEnvironment({
    GEMINI_USER_KEY_ENCRYPTION_SECRET: secret,
    GEMINI_API_KEY: "shared-gemini-api-key-with-more-than-20-characters",
  }, async () => {
    const result = await resolveGeminiApiKey({
      rpc: async () => ({ data: null, error: null }),
    }, "user-1");
    assert.deepEqual(result, { apiKey: process.env.GEMINI_API_KEY, source: "server" });
  });
});

test("Gemini key lookup errors do not silently fall back to the shared server key", async () => {
  await withGeminiEnvironment({
    GEMINI_USER_KEY_ENCRYPTION_SECRET: secret,
    GEMINI_API_KEY: "shared-gemini-api-key-with-more-than-20-characters",
  }, async () => {
    const result = await resolveGeminiApiKey({
      rpc: async () => ({ data: null, error: { code: "PGRST202" } }),
    }, "user-1");
    assert.deepEqual(result, { apiKey: null, error: "lookup" });
  });
});

test("Gemini resolution does not silently fall back when a saved key cannot be decrypted", async () => {
  await withGeminiEnvironment({
    GEMINI_USER_KEY_ENCRYPTION_SECRET: "99".repeat(32),
    GEMINI_API_KEY: "shared-gemini-api-key-with-more-than-20-characters",
  }, async () => {
    const result = await resolveGeminiApiKey({
      rpc: async () => ({ data: encryptGeminiKey("personal-gemini-api-key-with-more-than-20-characters", secret, "user-1"), error: null }),
    }, "user-1");
    assert.deepEqual(result, { apiKey: null, error: "decrypt" });
  });
});
