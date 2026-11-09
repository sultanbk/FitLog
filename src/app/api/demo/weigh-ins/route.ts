import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DEMO_COOKIE_MAX_AGE,
  DEMO_SESSION_COOKIE,
  DEMO_WEIGH_INS_COOKIE,
  getDemoWeighIns,
} from "@/lib/demo-session";

export async function POST(request: Request) {
  if (process.env.FITLOG_ENABLE_DEMO !== "true") return new Response("Not found", { status: 404 });
  if (request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`) !== true) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const weightKg = Number(formData.get("weight_kg"));
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350) {
    return NextResponse.redirect(new URL("/progress?weightError=Enter+a+weight+between+25+and+350+kg", request.url), 303);
  }

  const previousEntries = await getDemoWeighIns();
  const entries = [
    { id: randomUUID(), weight_kg: weightKg, created_at: new Date().toISOString() },
    ...previousEntries,
  ].slice(0, 20);
  const response = NextResponse.redirect(new URL("/progress?weightSaved=1", request.url), 303);
  response.cookies.set(DEMO_WEIGH_INS_COOKIE, Buffer.from(JSON.stringify(entries)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });
  return response;
}
