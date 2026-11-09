import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const weightKg = Number(formData.get("weight_kg"));
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350) {
    return NextResponse.redirect(new URL("/progress?weightError=Enter+a+weight+between+25+and+350+kg", request.url), 303);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const { error } = await supabase.from("weigh_ins").insert({ user_id: user.id, weight_kg: weightKg });
  const destination = error ? "/progress?weightError=Could+not+save+your+weight.+Please+try+again" : "/progress?weightSaved=1";
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
