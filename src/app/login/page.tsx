import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
      <div className="fit-auth-panel grid w-full max-w-5xl overflow-hidden md:grid-cols-[.9fr_1.1fr]">
        <aside className="fit-auth-aside hidden flex-col justify-between p-10 md:flex lg:p-14">
          <p className="fit-brand w-fit">FitLog<span>.</span></p>
          <div className="py-12">
            <p className="fit-eyebrow">A gentler kind of tracking</p>
            <p className="mt-4 max-w-md font-serif text-4xl leading-tight tracking-tight text-[#35483a] lg:text-5xl">Notice the little things. Build a rhythm that feels like yours.</p>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#62685f]">Your health journal stays personal, private, and ready when you are.</p>
        </aside>
        <section className="p-7 sm:p-10 lg:p-14">
          <p className="fit-eyebrow md:hidden">FitLog · your private journal</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-[#7b8077]">Sign in with your FitLog username and password.</p>
          <LoginForm error={params.error} />
          <p className="mt-8 border-t border-[#efede7] pt-5 text-xs leading-5 text-[#7b8077]">A calm space for your food journal, goals, and progress.</p>
        </section>
      </div>
    </main>
  );
}