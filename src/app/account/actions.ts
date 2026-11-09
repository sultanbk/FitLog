"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 10 || password.length > 128) redirect("/settings?passwordError=Use+a+password+between+10+and+128+characters#account-data");
  if (password !== confirmation) redirect("/settings?passwordError=Passwords+do+not+match#account-data");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password });
  redirect(error ? "/settings?passwordError=Could+not+update+password#account-data" : "/settings?passwordSaved=1#account-data");
}