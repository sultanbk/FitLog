"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const accountEmails: Record<string, string> = {
  tipu: "tipu@fitlog.local",
  shrutikagk: "shrutikagk@fitlog.local",
  saukan: "saukan@fitlog.local",
};

export async function signInWithPassword(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase().replace(/[\s._-]+/g, "");
  const password = String(formData.get("password") ?? "");
  const email = accountEmails[username];
  if (!email || password.length < 1 || password.length > 128) redirect("/login?error=Username+or+password+is+incorrect");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Username+or+password+is+incorrect");
  redirect("/");
}