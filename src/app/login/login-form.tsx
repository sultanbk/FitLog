import { signInWithPassword } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export function LoginForm({ error }: { error?: string }) {
  return (
    <>
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.replaceAll("+", " ")}</p>}
      <form action={signInWithPassword} className="mt-8 space-y-4">
        <label htmlFor="username" className="block text-sm font-medium text-[#454c42]">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="fit-input" placeholder="e.g. tipu" />
        <label htmlFor="password" className="block text-sm font-medium text-[#454c42]">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="fit-input" />
        <FormSubmitButton pendingLabel="Signing in…" className="fit-button-primary mt-2 w-full">Sign in</FormSubmitButton>
      </form>
    </>
  );
}