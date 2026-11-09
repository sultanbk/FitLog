"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (password.length < 10 || password.length > 128) redirect("/profile?passwordError=Use+a+password+between+10+and+128+characters#account-password");
  if (password !== confirmation) redirect("/profile?passwordError=Passwords+do+not+match#account-password");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password });
  redirect(error ? "/profile?passwordError=Could+not+update+password#account-password" : "/profile?passwordSaved=1#account-password");
}