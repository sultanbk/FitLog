import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_COOKIE_MAX_AGE, DEMO_PROFILE_COOKIE, getDemoState } from "@/lib/demo-session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid FitLog Coach setting." }, { status: 400 });
  }
  const enabled = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { enabled?: unknown }).enabled
    : undefined;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid FitLog Coach setting." }, { status: 400 });
  }

  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const demo = await getDemoState();
    if (!demo.active || !demo.profile) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const profile = { ...demo.profile, gemini_coach_enabled: enabled };
    const cookieStore = await cookies();
    cookieStore.set(DEMO_PROFILE_COOKIE, Buffer.from(JSON.stringify(profile)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEMO_COOKIE_MAX_AGE,
    });
    return NextResponse.json({ enabled });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const { data, error } = await supabase.from("profiles")
    .update({ gemini_coach_enabled: enabled })
    .eq("id", user.id)
    .select("gemini_coach_enabled")
    .maybeSingle();
  if (error || !data) {
    console.error("Could not update FitLog Coach consent", { code: error?.code });
    return NextResponse.json({ error: "Could not update Coach settings. Check the FitLog Coach database migration and try again." }, { status: 500 });
  }
  return NextResponse.json({ enabled: data.gemini_coach_enabled === true });
}
