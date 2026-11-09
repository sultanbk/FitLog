import { LoginForm } from "./login-form";

export default function LoginPage() {
  const isLocalDemo = process.env.NODE_ENV !== "production";
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7e9e2] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG</p>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">A fresh start, one step at a time.</h1>
        {isLocalDemo ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[#697066]">Use a local demo account to build and preview FitLog.</p>
            <form action="/api/demo/session" method="post" className="mt-8">
              <button className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b]">Continue as demo user</button>
            </form>
            <p className="mt-4 text-center text-xs text-[#81877e]">Local testing only. This demo does not use Supabase.</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-[#697066]">Enter your email and we&apos;ll send you a secure sign-in link.</p>
            <LoginForm />
          </>
        )}
      </section>
    </main>
  );
}
