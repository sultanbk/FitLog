import { FormSubmitButton } from "@/components/form-submit-button";

const messages: Record<string, { text: string; error?: boolean }> = {
  saved: { text: "Your personal Gemini key is saved and will be used for Gemini features." },
  removed: { text: "Your personal key was removed. FitLog will use its shared server key if configured." },
  invalid: { text: "Enter a valid Gemini API key and try again.", error: true },
  error: { text: "The key could not be updated. Please try again.", error: true },
  demo: { text: "Personal API keys are unavailable in demo mode.", error: true },
  "encryption-not-configured": { text: "Personal keys are unavailable until the server encryption secret is configured.", error: true },
};

export function GeminiKeyManager({
  isConfigured,
  sharedKeyAvailable,
  encryptionConfigured,
  keyStoreReady,
  demo,
  result,
}: {
  isConfigured: boolean;
  sharedKeyAvailable: boolean;
  encryptionConfigured: boolean;
  keyStoreReady: boolean;
  demo: boolean;
  result?: string;
}) {
  const message = result ? messages[result] : undefined;

  return (
    <section id="gemini-key" aria-labelledby="gemini-key-title" className="fit-card scroll-mt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="gemini-key-title" className="text-xl">Your Gemini API key</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">Add your own key from Google AI Studio. It will be used for food parsing, meal ideas, and weekly reflections instead of the shared server key.</p>
        </div>
        <span className={isConfigured ? "rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#315c35]" : "rounded-full bg-[#f1f2ef] px-3 py-1 text-xs font-semibold text-[#697066]"}>
          {isConfigured ? "Personal key saved" : sharedKeyAvailable ? "Using shared key" : "No key configured"}
        </span>
      </div>

      <p className="mt-4 rounded-2xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#697066]">
        Your key is encrypted on the server before it is stored. It is never shown again or sent to your browser, and can be removed here. It is checked the next time you use a Gemini feature. Google applies your key’s quota, billing, and data policies to those requests.
      </p>
      {demo && <p role="status" className="mt-3 text-sm text-[#697066]">Personal keys are disabled in demo mode. Use FitLog’s server-configured key there.</p>}
      {!demo && keyStoreReady && !encryptionConfigured && (
        <div role="alert" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Set up key encryption to add your personal Gemini key</p>
          <p className="mt-1">Generate a secret with <code className="rounded bg-amber-100 px-1.5 py-0.5">node -e &quot;console.log(require(&apos;node:crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code>, then add its 64-character output as <code className="rounded bg-amber-100 px-1.5 py-0.5">GEMINI_USER_KEY_ENCRYPTION_SECRET</code> in your server environment.</p>
          <p className="mt-1">For local development, put it in <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code> and restart the dev server. On Vercel, add it under Project Settings → Environment Variables and redeploy. Keep the same secret; saved keys cannot be decrypted without it.</p>
        </div>
      )}
      {message && <p role={message.error ? "alert" : "status"} className={message.error ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-[#315c35]"}>{message.text}</p>}

      {!demo && (
        <div className="mt-4 flex flex-col gap-4">
          {keyStoreReady && encryptionConfigured && (
            <form action="/api/profile/gemini-key" method="post" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="action" value="save" />
              <label className="block text-sm font-medium text-[#454c42]">
                {isConfigured ? "Replace personal key" : "Gemini API key"}
                <input name="api_key" type="password" autoComplete="new-password" required minLength={20} maxLength={2048} pattern="[\x21-\x7e]+" className="fit-input mt-1.5" />
              </label>
              <FormSubmitButton pendingLabel="Saving securely…" className="fit-button-primary w-full sm:w-auto">Save key</FormSubmitButton>
            </form>
          )}
          {keyStoreReady && isConfigured && (
            <form action="/api/profile/gemini-key" method="post">
              <input type="hidden" name="action" value="delete" />
              <button data-pending-label="Removing…" className="rounded-lg px-2 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Remove personal key</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
