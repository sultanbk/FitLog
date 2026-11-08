import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e9e2] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG · YOUR PROFILE</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Let’s set your starting point.</h1>
        <p className="mt-3 text-sm leading-6 text-[#697066]">These details are private to your account and help us estimate a daily calorie target.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <form action={saveProfile} className="mt-8 space-y-5">
          <Field id="height_cm" label="Height" unit="cm" min="80" max="250" step="0.1" />
          <Field id="current_weight_kg" label="Current weight" unit="kg" min="25" max="350" step="0.1" />
          <Field id="goal_weight_kg" label="Goal weight" unit="kg" min="25" max="350" step="0.1" />
          <Field id="goal_duration_days" label="Goal duration" unit="days" min="14" max="3650" step="1" />
          <button className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b]">Save and see my target</button>
        </form>
      </section>
    </main>
  );
}

function Field({ id, label, unit, min, max, step }: { id: string; label: string; unit: string; min: string; max: string; step: string }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><div className="relative"><input id={id} name={id} type="number" required min={min} max={max} step={step} className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 pr-16 outline-none focus:border-[#57834d]" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#81877e]">{unit}</span></div></div>;
}
