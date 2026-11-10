"use client";

import { useState } from "react";

export function FitLogCoachConsent({ enabled }: { enabled: boolean }) {
  const [consented, setConsented] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function updateConsent(nextValue: boolean) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile/coach-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextValue }),
      });
      const result = await response.json() as { error?: string; enabled?: boolean };
      if (!response.ok || result.enabled !== nextValue) {
        throw new Error(result.error || "Could not update FitLog Coach settings.");
      }
      setConsented(nextValue);
      setMessage(nextValue ? "FitLog Coach is enabled." : "FitLog Coach is turned off.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update FitLog Coach settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div id="fitlog-coach-consent" className="fit-card mt-4 scroll-mt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h3 className="text-base font-semibold text-[#35483a]">FitLog Coach · separate opt-in</h3>
          <p className="mt-1 text-sm leading-6 text-[#697066]">When you enable Coach and send a message, FitLog sends your profile details, today’s food and exercise entries (including food names and nutrition), seven-day food and activity totals, and weigh-ins from the last 14 days to Gemini. Follow-up messages also send the current chat for context. Coach is read-only and cannot change goals or logs. Chats stay in the current page and are not saved to your account.</p>
          <p className="mt-2 text-xs leading-5 text-[#7b8077]">Google’s data terms apply. On unpaid Gemini services, submitted content may be used to improve services and may be reviewed by people; Google advises against submitting personal or sensitive information to unpaid services. You can turn Coach off here at any time.</p>
        </div>
        <button type="button" onClick={() => updateConsent(!consented)} disabled={pending} aria-pressed={consented} className={consented ? "rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-3 text-sm font-semibold text-[#3e5944] disabled:opacity-60" : "fit-button-primary disabled:opacity-60"}>
          {pending ? "Saving…" : consented ? "Turn Coach off" : "Enable FitLog Coach"}
        </button>
      </div>
      {message && <p role="status" className="mt-3 text-sm text-[#52644e]">{message}</p>}
    </div>
  );
}
