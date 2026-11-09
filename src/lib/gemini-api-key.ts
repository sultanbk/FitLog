import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptGeminiKey } from "./gemini-key-crypto.ts";

export type GeminiKeyResult =
  | { apiKey: string; source: "personal" | "server" }
  | { apiKey: null; source: "missing" }
  | { apiKey: null; error: "lookup" | "decrypt" };

export async function resolveGeminiApiKey(supabase: SupabaseClient, userId: string): Promise<GeminiKeyResult> {
  const { data: encryptedKey, error } = await supabase.rpc("get_my_gemini_key");
  if (error) return { apiKey: null, error: "lookup" };

  if (typeof encryptedKey === "string" && encryptedKey.length > 0) {
    const secret = process.env.GEMINI_USER_KEY_ENCRYPTION_SECRET;
    if (!secret) return { apiKey: null, error: "decrypt" };
    try {
      return { apiKey: decryptGeminiKey(encryptedKey, secret, userId), source: "personal" };
    } catch {
      return { apiKey: null, error: "decrypt" };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? { apiKey, source: "server" } : { apiKey: null, source: "missing" };
}
