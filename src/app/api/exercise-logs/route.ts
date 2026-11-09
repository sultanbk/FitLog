import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isValidExerciseLogDate, isValidExerciseRepetitions } from "@/lib/exercise-logs";
import {
  DEMO_COOKIE_MAX_AGE,
  DEMO_EXERCISE_LOGS_COOKIE,
  DEMO_SESSION_COOKIE,
  getDemoExerciseLogs,
} from "@/lib/demo-session";

function todayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function redirectToExercise(request: Request, day: string, key: string, value: string) {
  const url = new URL("/exercise", request.url);
  url.searchParams.set("day", day);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const requestedDay = String(form.get("entry_date") ?? "");
  const today = todayInAppTimezone();
  const day = isValidExerciseLogDate(requestedDay) && requestedDay <= today ? requestedDay : today;
  if (!isValidExerciseLogDate(requestedDay) || requestedDay > today) {
    return redirectToExercise(request, day, "exerciseError", "Choose+a+valid+date+not+in+the+future");
  }

  const action = String(form.get("action") ?? "log");
  const id = String(form.get("id") ?? "");
  if (action !== "log" && action !== "delete") {
    return redirectToExercise(request, day, "exerciseError", "Invalid+push-up+log+action");
  }

  const isDemo = process.env.FITLOG_ENABLE_DEMO === "true" &&
    request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`);

  if (isDemo) {
    const logs = await getDemoExerciseLogs();
    if (action === "delete" && !logs.some((log) => log.id === id && log.entry_date === day)) {
      return redirectToExercise(request, day, "exerciseError", "Could+not+find+that+push-up+log");
    }
    const next = action === "delete"
      ? logs.filter((log) => log.id !== id || log.entry_date !== day)
      : createExerciseLog(logs, day, form.get("repetitions"));
    if (!next) return redirectToExercise(request, day, "exerciseError", "Enter+a+whole+number+of+push-ups+between+1+and+10000");
    const cookieStore = await cookies();
    cookieStore.set(DEMO_EXERCISE_LOGS_COOKIE, Buffer.from(JSON.stringify(next)).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: DEMO_COOKIE_MAX_AGE,
    });
    return redirectToExercise(request, day, "exerciseSaved", "1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  if (action === "delete") {
    const { data, error } = await supabase.from("exercise_logs")
      .delete()
      .eq("id", id)
      .eq("entry_date", day)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    const failed = Boolean(error || !data);
    return redirectToExercise(request, day, failed ? "exerciseError" : "exerciseSaved", failed ? "Could+not+delete+push-up+log" : "1");
  }

  const repetitions = Number(form.get("repetitions"));
  if (!isValidExerciseRepetitions(repetitions)) {
    return redirectToExercise(request, day, "exerciseError", "Enter+a+whole+number+of+push-ups+between+1+and+10000");
  }

  const { error } = await supabase.from("exercise_logs").insert({
    user_id: user.id,
    entry_date: day,
    exercise: "push-ups",
    repetitions,
  });
  return redirectToExercise(request, day, error ? "exerciseError" : "exerciseSaved", error ? "Could+not+save+push-up+log" : "1");
}

function createExerciseLog(
  logs: Awaited<ReturnType<typeof getDemoExerciseLogs>>,
  day: string,
  rawRepetitions: FormDataEntryValue | null,
) {
  const repetitions = Number(rawRepetitions);
  if (!isValidExerciseRepetitions(repetitions)) return null;
  return [
    { id: randomUUID(), entry_date: day, exercise: "push-ups" as const, repetitions, created_at: new Date().toISOString() },
    ...logs,
  ].slice(0, 20);
}
