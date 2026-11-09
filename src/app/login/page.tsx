import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7e9e2] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG</p>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">A fresh start, one step at a time.</h1>
        <p className="mt-3 text-sm leading-6 text-[#697066]">Sign in with your FitLog username and password.</p>
        <LoginForm error={params.error} />
      </section>
    </main>
  );
}