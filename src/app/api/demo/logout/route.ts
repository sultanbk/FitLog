import { NextResponse } from "next/server";
import { DEMO_FOOD_ENTRIES_COOKIE, DEMO_FOOD_MEMORY_COOKIE, DEMO_PROFILE_COOKIE, DEMO_SESSION_COOKIE, DEMO_WEIGH_INS_COOKIE } from "@/lib/demo-session";

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return new Response("Not found", { status: 404 });
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(DEMO_SESSION_COOKIE);
  response.cookies.delete(DEMO_PROFILE_COOKIE);
  response.cookies.delete(DEMO_WEIGH_INS_COOKIE);
  response.cookies.delete(DEMO_FOOD_ENTRIES_COOKIE);
  response.cookies.delete(DEMO_FOOD_MEMORY_COOKIE);
  return response;
}
