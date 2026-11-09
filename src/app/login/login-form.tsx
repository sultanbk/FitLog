import { signInWithPassword } from "./actions";

export function LoginForm({ error }: { error?: string }) {
  return (
    <>
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.replaceAll("+", " ")}</p>}
      <form action={signInWithPassword} className="mt-8 space-y-4">
        <label htmlFor="username" className="block text-sm font-medium">Username</label>
        <input id="username" name="username" autoComplete="username" required className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 outline-none focus:border-[#57834d]" placeholder="e.g. tipu" />
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 outline-none focus:border-[#57834d]" />
        <button className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b]">Sign in</button>
      </form>
    </>
  );
}