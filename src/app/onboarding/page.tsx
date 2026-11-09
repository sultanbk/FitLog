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
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
      <div className="fit-auth-panel grid w-full max-w-6xl overflow-hidden md:grid-cols-[.8fr_1.2fr]">
        <aside className="fit-auth-aside hidden flex-col justify-between p-10 md:flex lg:p-14">
          <p className="fit-brand">FitLog<span>.</span></p>
          <div className="py-12">
            <p className="fit-eyebrow">A thoughtful beginning</p>
            <p className="mt-4 max-w-md font-serif text-4xl leading-tight tracking-tight text-[#35483a] lg:text-5xl">Start with what feels right for you.</p>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#62685f]">Your details belong to your account and help shape your personal estimates.</p>
        </aside>
        <section className="p-6 sm:p-10 lg:p-14">
          <p className="fit-eyebrow md:hidden">FitLog · your private journal</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">Let’s find your starting point.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#7b8077]">These details help us estimate your daily target. You can update them whenever you need.</p>
          {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {isLocalDemo ? (
            <form action="/api/demo/profile" method="post" data-draft-key="profile-onboarding" className="mt-8 space-y-5">
              <p data-draft-status className="text-xs text-[#7b8077]">Your unfinished profile is saved only in this browser tab.</p>
              <ProfileFields />
            </form>
          ) : (
            <form action={saveProfile} data-draft-key="profile-onboarding" className="mt-8 space-y-5">
              <p data-draft-status className="text-xs text-[#7b8077]">Your unfinished profile is saved only in this browser tab.</p>
              <ProfileFields />
            </form>
          )}
          <p className="mt-6 text-center text-xs text-[#7b8077]">Your personal estimates are not medical advice.</p>
        </section>
      </div>
    </main>
  );
}
