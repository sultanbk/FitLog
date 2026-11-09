import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDemoState } from "@/lib/demo-session";
import { saveProfile } from "./actions";
import { ProfileFields } from "@/components/profile-fields";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const isLocalDemo = process.env.FITLOG_ENABLE_DEMO === "true";
  if (isLocalDemo) {
    const demo = await getDemoState();
    if (!demo.active) redirect("/login");
    if (demo.profile) redirect("/today");
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: profile } = await supabase.from("profiles").select("age_years,sex,activity_level").eq("id", user.id).maybeSingle();
    if (profile?.age_years != null && profile.sex && profile.activity_level) redirect("/today");
  }
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e9e2] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG · YOUR PROFILE</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Let’s set your starting point.</h1>
        <p className="mt-3 text-sm leading-6 text-[#697066]">These details are private to your account and help us estimate a daily calorie target.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {isLocalDemo ? (
          <form action="/api/demo/profile" method="post" className="mt-8 space-y-5">
            <ProfileFields />
          </form>
        ) : (
          <form action={saveProfile} className="mt-8 space-y-5">
            <ProfileFields />
          </form>
        )}
      </section>
    </main>
  );
}
