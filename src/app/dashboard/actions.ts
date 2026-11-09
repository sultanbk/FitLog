"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_PROFILE_COOKIE, DEMO_SESSION_COOKIE } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_SESSION_COOKIE);
    cookieStore.delete(DEMO_PROFILE_COOKIE);
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
