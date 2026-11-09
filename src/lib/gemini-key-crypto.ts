import { createDecipheriv, createCipheriv, randomBytes } from "node:crypto";

const version = "v1";
const ivLength = 12;
const authTagLength = 16;

function encryptionKey(secret: string) {
  if (!/^[\da-f]{64}$/i.test(secret)) {
    throw new Error("GEMINI_USER_KEY_ENCRYPTION_SECRET must be a 64-character hex-encoded key.");
  }
  return Buffer.from(secret, "hex");
}

export function encryptGeminiKey(apiKey: string, secret: string, userId: string) {
  const key = encryptionKey(secret);
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(userId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [version, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptGeminiKey(encrypted: string, secret: string, userId: string) {
  const [storedVersion, encodedIv, encodedTag, encodedCiphertext, extra] = encrypted.split(".");
  if (storedVersion !== version || !encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
    throw new Error("Stored Gemini key has an unsupported encrypted format.");
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const authTag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  if (iv.length !== ivLength || authTag.length !== authTagLength || ciphertext.length === 0) {
    throw new Error("Stored Gemini key has invalid encrypted data.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
  decipher.setAAD(Buffer.from(userId, "utf8"));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
