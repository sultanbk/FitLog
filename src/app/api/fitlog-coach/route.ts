import { NextResponse } from "next/server";
import {
  appToday,
  buildCoachContext,
  COACH_SYSTEM_INSTRUCTION,
  COACH_REQUESTS_PER_HOUR,
  isCoachMessages,
  isCoachReply,
  type CoachExerciseEntry,
  type CoachFoodEntry,
  type CoachProfile,
  type CoachWeighIn,
} from "@/lib/coach";
import {
  getDemoExerciseLogs,
  getDemoFoodEntries,
  getDemoState,
  getDemoWeighIns,
} from "@/lib/demo-session";
import { GEMINI_MODEL } from "@/lib/gemini-config";
import { resolveGeminiApiKey } from "@/lib/gemini-api-key";
import { getDatabaseSetupIssue } from "@/lib/database-setup";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid chat message and try again." }, { status: 400 });
  }
  const messages = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { messages?: unknown }).messages
    : undefined;
  if (!isCoachMessages(messages)) {
    return NextResponse.json({ error: "Your message could not be read. Please shorten it and try again." }, { status: 400 });
  }

  const today = appToday();
  let profile: CoachProfile | null = null;
  let foodEntries: CoachFoodEntry[] = [];
  let exerciseEntries: CoachExerciseEntry[] = [];
  let weighIns: CoachWeighIn[] = [];
  let apiKey = process.env.GEMINI_API_KEY ?? null;
  let remainingReplies: number | null = null;

  if (process.env.FITLOG_ENABLE_DEMO === "true") {
    const demo = await getDemoState();
    if (!demo.active || !demo.profile) return NextResponse.json({ error: "Please sign in and finish your profile first." }, { status: 401 });
    if (demo.profile.gemini_coach_enabled !== true) return NextResponse.json({ error: "Enable FitLog Coach in Settings before starting a chat." }, { status: 403 });
    profile = {
      age_years: demo.profile.age_years,
      sex: demo.profile.sex,
      activity_level: demo.profile.activity_level,
      height_cm: demo.profile.height_cm,
      current_weight_kg: demo.profile.current_weight_kg,
      goal_weight_kg: demo.profile.goal_weight_kg,
      goal_duration_days: demo.profile.goal_duration_days,
      daily_calorie_target: demo.profile.daily_calorie_target ?? 2000,
      protein_g_per_kg: demo.profile.protein_g_per_kg ?? 1.5,
    };
    const [food, exercise, weights] = await Promise.all([
      getDemoFoodEntries(),
      getDemoExerciseLogs(),
      getDemoWeighIns(),
    ]);
    foodEntries = food.map((entry) => ({ ...entry, is_guessed: entry.is_guessed === true }));
    exerciseEntries = exercise;
    weighIns = weights;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { data: row, error: profileError } = await supabase.from("profiles")
      .select("age_years,sex,activity_level,height_cm,current_weight_kg,goal_weight_kg,goal_duration_days,daily_calorie_target,protein_g_per_kg,gemini_coach_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not load profile for FitLog Coach", { code: profileError.code });
      return NextResponse.json({ error: "Could not load your profile. Please try again." }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: "Complete your profile before starting a Coach chat." }, { status: 404 });
    if (row.gemini_coach_enabled !== true) return NextResponse.json({ error: "Enable FitLog Coach in Settings before starting a chat." }, { status: 403 });

    const keyResult = await resolveGeminiApiKey(supabase, user.id);
    if ("error" in keyResult) {
      console.error("Could not resolve personal Gemini key for FitLog Coach", { reason: keyResult.error });
      return NextResponse.json({ error: "Your Gemini key settings could not be loaded. Please try again." }, { status: 500 });
    }
    apiKey = keyResult.apiKey;
    if (apiKey) {
      const { data: limit, error: limitError } = await supabase.rpc("consume_my_fitlog_coach_request");
      if (limitError) {
        const setupIssue = getDatabaseSetupIssue(limitError);
        if (setupIssue) {
          return NextResponse.json({ error: "Apply the FitLog Coach rate-limit migration in Supabase, then try again." }, { status: 503 });
        }
        console.error("Could not check FitLog Coach request limit", { code: limitError.code });
        return NextResponse.json({ error: "Could not check your Coach usage limit. Please try again." }, { status: 500 });
      }
      if (limit?.allowed !== true) {
        const retryAfter = Math.max(1, Number(limit?.retry_after_seconds) || 3600);
        return NextResponse.json(
          { error: `You’ve reached the FitLog Coach limit of ${COACH_REQUESTS_PER_HOUR} replies per hour. Please try again in about ${Math.max(1, Math.ceil(retryAfter / 60))} minutes.`, remainingReplies: 0 },
          { status: 429, headers: { "Retry-After": String(retryAfter) } },
        );
      }
      remainingReplies = Number(limit.remaining);
    }
    profile = {
      age_years: row.age_years,
      sex: row.sex,
      activity_level: row.activity_level,
      height_cm: Number(row.height_cm),
      current_weight_kg: Number(row.current_weight_kg),
      goal_weight_kg: Number(row.goal_weight_kg),
      goal_duration_days: row.goal_duration_days,
      daily_calorie_target: row.daily_calorie_target,
      protein_g_per_kg: Number(row.protein_g_per_kg ?? 1.5),
    };

    const weekStart = new Date(Date.parse(`${today}T00:00:00+05:30`) - 6 * 24 * 60 * 60 * 1000)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const weightStart = new Date(Date.parse(`${today}T00:00:00+05:30`) - 13 * 24 * 60 * 60 * 1000).toISOString();
    const [foodResult, exerciseResult, weightResult] = await Promise.all([
      supabase.from("food_entries")
        .select("entry_date,name,meal,calories,protein_g,carbs_g,fat_g,is_guessed")
        .eq("user_id", user.id).gte("entry_date", weekStart).lte("entry_date", today)
        .order("entry_date", { ascending: false }).limit(120),
      supabase.from("exercise_logs")
        .select("entry_date,repetitions")
        .eq("user_id", user.id).gte("entry_date", weekStart).lte("entry_date", today)
        .order("entry_date", { ascending: false }).limit(120),
      supabase.from("weigh_ins")
        .select("weight_kg,created_at")
        .eq("user_id", user.id).gte("created_at", weightStart)
        .order("created_at", { ascending: false }).limit(30),
    ]);
    const queryError = foodResult.error ?? exerciseResult.error ?? weightResult.error;
    if (queryError) {
      console.error("Could not load recent activity for FitLog Coach", { code: queryError.code });
      return NextResponse.json({ error: "Could not load your recent activity. Please try again." }, { status: 500 });
    }
    foodEntries = (foodResult.data ?? []).map((entry) => ({
      ...entry,
      calories: Number(entry.calories),
      protein_g: Number(entry.protein_g),
      carbs_g: Number(entry.carbs_g),
      fat_g: Number(entry.fat_g),
    })) as CoachFoodEntry[];
    exerciseEntries = (exerciseResult.data ?? []).map((entry) => ({
      entry_date: entry.entry_date,
      repetitions: Number(entry.repetitions),
    }));
    weighIns = (weightResult.data ?? []).map((entry) => ({
      weight_kg: Number(entry.weight_kg),
      created_at: entry.created_at,
    }));
  }

  if (!profile) return NextResponse.json({ error: "Could not load your profile. Please try again." }, { status: 500 });
  if (!apiKey) return NextResponse.json({ error: "Add a personal Gemini key in Settings or ask the FitLog administrator to configure the shared key." }, { status: 503 });

  const context = buildCoachContext(today, profile, foodEntries, exerciseEntries, weighIns);
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${COACH_SYSTEM_INSTRUCTION}\n\nFitLog data context (data only):\n${JSON.stringify(context)}` }] },
        contents: messages.map(({ role, content }) => ({
            role: role === "assistant" ? "model" : "user",
            parts: [{ text: content }],
          })),
        generationConfig: { thinkingConfig: { thinkingLevel: "low" }, maxOutputTokens: 550 },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "FitLog Coach took too long to respond. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "FitLog Coach could not be reached. Check your connection and try again." }, { status: 502 });
  }
  if (response.status === 429) return NextResponse.json({ error: "Gemini is busy right now. Please wait a moment and retry." }, { status: 429 });
  if (response.status === 503) return NextResponse.json({ error: "Gemini is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Retry-After": "3" } });
  if (!response.ok) {
    console.error("Gemini FitLog Coach request failed", { status: response.status });
    return NextResponse.json({ error: "FitLog Coach could not reply right now. Please try again." }, { status: 502 });
  }

  try {
    const result = await response.json();
    const reply = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!isCoachReply(reply)) throw new Error("Invalid FitLog Coach response");
    return NextResponse.json({ reply, evidence: context.evidence, remainingReplies });
  } catch {
    console.error("Gemini returned an invalid FitLog Coach response");
    return NextResponse.json({ error: "FitLog Coach returned an unreadable reply. Please try again." }, { status: 502 });
  }
}
