import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` },
  });

  if (error) {
    console.error("Supabase sign-in link request failed", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    if (error.code === "over_email_send_rate_limit") {
      return NextResponse.json({ error: "Supabase’s email limit has been reached. Wait for it to reset or configure custom SMTP." }, { status: 429 });
    }
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return NextResponse.json({ error: "Too many sign-in requests. Wait a few minutes, then try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Could not send the sign-in link. Check the Supabase Auth logs for details." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
