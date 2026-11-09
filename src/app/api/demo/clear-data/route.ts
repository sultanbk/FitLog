import { NextResponse } from "next/server";
import {
  DEMO_EXERCISE_LOGS_COOKIE,
  DEMO_FOOD_ENTRIES_COOKIE,
  DEMO_FOOD_MEMORY_COOKIE,
  DEMO_PROFILE_COOKIE,
  DEMO_QUICK_ADDS_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_WEIGH_INS_COOKIE,
} from "@/lib/demo-session";

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return new Response("Not found", { status: 404 });

  const isActiveDemo = request.headers.get("cookie")
    ?.split(";")
    .some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`);
  if (!isActiveDemo) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  if (form.get("confirmation") !== "CLEAR") {
    return NextResponse.redirect(new URL("/settings?clearDataError=confirmation#account-data", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/onboarding?dataCleared=1", request.url), 303);
  response.cookies.delete(DEMO_PROFILE_COOKIE);
  response.cookies.delete(DEMO_WEIGH_INS_COOKIE);
  response.cookies.delete(DEMO_EXERCISE_LOGS_COOKIE);
  response.cookies.delete(DEMO_FOOD_ENTRIES_COOKIE);
  response.cookies.delete(DEMO_FOOD_MEMORY_COOKIE);
  response.cookies.delete(DEMO_QUICK_ADDS_COOKIE);
  return response;
}
