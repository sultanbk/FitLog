import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptGeminiKey } from "@/lib/gemini-key-crypto";

function redirectTo(request: Request, result: string) {
  const url = new URL("/settings", request.url);
  url.searchParams.set("geminiKey", result);
  url.hash = "gemini-key";
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO === "true") return redirectTo(request, "demo");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const action = form.get("action");
  if (action === "delete") {
    const { error } = await supabase.rpc("delete_my_gemini_key");
    if (error) {
      console.error("Could not remove personal Gemini key", { code: error.code });
      return redirectTo(request, "error");
    }
    return redirectTo(request, "removed");
  }
  if (action !== "save") return redirectTo(request, "invalid");

  const apiKey = form.get("api_key");
  if (typeof apiKey !== "string" || !/^[\x21-\x7e]{20,2048}$/.test(apiKey.trim())) {
    return redirectTo(request, "invalid");
  }

  const secret = process.env.GEMINI_USER_KEY_ENCRYPTION_SECRET;
  if (!secret) return redirectTo(request, "encryption-not-configured");

  let encryptedKey: string;
  try {
    encryptedKey = encryptGeminiKey(apiKey.trim(), secret, user.id);
  } catch {
    return redirectTo(request, "encryption-not-configured");
  }

  const { error } = await supabase.rpc("set_my_gemini_key", { p_encrypted_key: encryptedKey });
  if (error) {
    console.error("Could not save personal Gemini key", { code: error.code });
    return redirectTo(request, "error");
  }
  return redirectTo(request, "saved");
}
