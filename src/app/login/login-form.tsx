"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = createClient();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback` },
      });
      if (authError) throw authError;
      setSent(true);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Please try again.";
      const errorCode = typeof authError === "object" && authError !== null && "code" in authError
        ? authError.code
        : undefined;
      if (errorCode === "over_email_send_rate_limit") {
        setError("Supabase email limit reached. Wait for it to reset or configure custom SMTP.");
      } else if (errorCode === "over_request_rate_limit") {
        setError("Too many attempts. Wait a few minutes, then try again.");
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {sent && <p role="status" className="mt-6 rounded-xl bg-[#edf5e9] p-4 text-sm text-[#335c2c]">Check your inbox for your sign-in link.</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label htmlFor="email" className="block text-sm font-medium">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 outline-none focus:border-[#57834d]" placeholder="you@example.com" />
        <button disabled={pending} className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b] disabled:cursor-wait disabled:opacity-60">
          {pending ? "Sending link..." : "Email me a sign-in link"}
        </button>
      </form>
    </>
  );
}
