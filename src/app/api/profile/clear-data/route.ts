import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (form.get("confirmation") !== "CLEAR") {
    return redirectTo(request, "/settings?clearDataError=confirmation#account-data");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectTo(request, "/login");

  const { error } = await supabase.rpc("clear_my_fitlog_data");
  if (error) return redirectTo(request, "/settings?clearDataError=failed#account-data");

  return redirectTo(request, "/onboarding?dataCleared=1");
}
