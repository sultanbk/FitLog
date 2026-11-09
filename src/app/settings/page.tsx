import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileFields, type EditableProfile } from "@/components/profile-fields";
import { updateProfile } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { getDemoState } from "@/lib/demo-session";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const localDemo = process.env.FITLOG_ENABLE_DEMO === "true";
  let profile: EditableProfile | null = null;

  if (localDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    if (!demo.profile) redirect("/onboarding");
    profile = {
      age_years: demo.profile.age_years,
      sex: demo.profile.sex,
      activity_level: demo.profile.activity_level,
      height_cm: demo.profile.height_cm,
      current_weight_kg: demo.profile.current_weight_kg,
      goal_weight_kg: demo.profile.goal_weight_kg,
      goal_duration_days: demo.profile.goal_duration_days,
    };
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data } = await supabase.from("profiles")
      .select("age_years,sex,activity_level,height_cm,current_weight_kg,goal_weight_kg,goal_duration_days")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) redirect("/onboarding");
    profile = data as EditableProfile;
  }

  return (
    <AppShell active="profile">
      <header className="mb-7">
        <Link href="/profile" className="text-sm font-semibold text-[#3e5944] hover:underline">← Back to Profile</Link>
        <p className="fit-eyebrow mt-6">Personal readings</p>
        <h1 className="fit-heading">Edit your profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b8077]">Updating these details recalculates your daily estimate using FitLog’s safe goal limits. Your food journal and weigh-ins stay unchanged.</p>
      </header>

      <section className="fit-card" aria-labelledby="profile-readings-title">
        <h2 id="profile-readings-title" className="mb-5 text-2xl">Your readings and goal</h2>
        {params.error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error.replaceAll("+", " ")}</p>}
        {profile && <form action={updateProfile} className="space-y-5"><ProfileFields initialProfile={profile} submitLabel="Save profile changes" /></form>}
      </section>
      <p className="mt-5 text-center text-xs text-[#81877e]">Calorie targets are estimates, not medical advice.</p>
    </AppShell>
  );
}