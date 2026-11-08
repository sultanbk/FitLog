"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestLoginLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/login?error=Enter+a+valid+email+address");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` },
  });
  if (error) {
    // Keep credentials and the submitted email out of logs while preserving
    // Supabase's response details for local troubleshooting.
    console.error("Supabase sign-in link request failed", {
      status: error.status,
      code: error.code,
      message: error.message,
      cause: error.cause instanceof Error
        ? { name: error.cause.name, message: error.cause.message, code: "code" in error.cause ? error.cause.code : undefined }
        : error.cause,
    });

    if (error.code === "over_email_send_rate_limit") {
      redirect("/login?error=Supabase’s+built-in+email+limit+has+been+reached.+It+allows+two+emails+per+hour+for+the+project.+Wait+for+it+to+reset+or+configure+custom+SMTP");
    }
    if (error.code === "over_request_rate_limit") {
      redirect("/login?error=Too+many+sign-in+attempts.+Wait+a+few+minutes+before+trying+again");
    }
    if (error.status === 429) {
      redirect("/login?error=Supabase+is+temporarily+rate-limiting+sign-in+emails.+Wait+before+retrying+or+check+your+project+email+limits");
    }
    redirect("/login?error=Could+not+send+the+sign-in+link.+Check+the+server+terminal+for+details");
  }
  redirect("/login?sent=1");
}
