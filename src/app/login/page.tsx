import { requestLoginLink } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e7e9e2] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-[#57834d]">FITLOG</p>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">A fresh start, one step at a time.</h1>
        <p className="mt-3 text-sm leading-6 text-[#697066]">Enter your email and we’ll send you a secure sign-in link.</p>
        {params.sent && <p className="mt-6 rounded-xl bg-[#edf5e9] p-4 text-sm text-[#335c2c]">Check your inbox for your sign-in link.</p>}
        {params.error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{params.error}</p>}
        <form action={requestLoginLink} className="mt-8 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 outline-none focus:border-[#57834d]" placeholder="you@example.com" />
          <button className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b]">Email me a sign-in link</button>
        </form>
      </section>
    </main>
  );
}
