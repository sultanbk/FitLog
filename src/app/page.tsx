import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDemoState } from "@/lib/demo-session";

export default async function Home() {
  if (process.env.NODE_ENV !== "production") {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    redirect(demo.profile ? "/today" : "/onboarding");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("age_years,sex,activity_level").eq("id", user.id).maybeSingle();
  const profileComplete = profile?.age_years != null && Boolean(profile.sex) && Boolean(profile.activity_level);
  redirect(profileComplete ? "/today" : "/onboarding");
}
