import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles")
    .select("height_cm,current_weight_kg,goal_weight_kg,goal_duration_days,daily_calorie_target")
    .eq("id", user.id).maybeSingle();
  if (error || !profile) redirect("/onboarding");

  return (
    <main className="min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between"><a href="/" className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG</a><form action={signOut}><button className="rounded-lg px-3 py-2 text-sm text-[#697066] hover:bg-white">Sign out</button></form></header>
        <section className="mt-12 rounded-3xl bg-[#315c35] p-8 text-white sm:p-12">
          <p className="text-sm font-medium text-[#d7e8d0]">YOUR DAILY CALORIE TARGET</p>
          <div className="mt-4 flex items-baseline gap-3"><span className="text-6xl font-semibold tracking-tight">{profile.daily_calorie_target.toLocaleString()}</span><span className="text-lg text-[#d7e8d0]">kcal / day</span></div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#e5eee1]">An estimate based on your current weight and goal timeline. Your planned weekly weight change is capped at 0.5 kg in this calculation.</p>
        </section>
        <section className="mt-8 rounded-3xl border border-[#e7e9e2] bg-white p-7 sm:p-9">
          <h1 className="text-xl font-semibold">Your starting point</h1>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
            <Stat label="Height" value={`${profile.height_cm} cm`} />
            <Stat label="Current weight" value={`${profile.current_weight_kg} kg`} />
            <Stat label="Goal weight" value={`${profile.goal_weight_kg} kg`} />
            <Stat label="Goal duration" value={`${profile.goal_duration_days} days`} />
          </dl>
        </section>
        <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-5 text-[#81877e]">This calorie target is a general estimate, not medical advice. Individual needs vary.</p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-[#81877e]">{label}</dt><dd className="mt-2 font-medium">{value}</dd></div>;
}
