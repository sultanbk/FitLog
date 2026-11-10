"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CoachEvidence, CoachMessage } from "@/lib/coach";

type DisplayMessage = CoachMessage & { evidence?: CoachEvidence[] };
type CoachStatus = "loading" | "ready" | "signed_out" | "profile_missing" | "consent_required" | "key_missing" | "error";

const suggestedQuestions = [
  "Summarize what I logged today.",
  "Which days did I log food this week?",
  "What activity did I log over the past week?",
];

export function FitLogCoach() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CoachStatus>("loading");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [remainingReplies, setRemainingReplies] = useState<number | null>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/fitlog-coach", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { status?: unknown; error?: string };
        if (!response.ok && response.status !== 401) throw new Error(result.error || "Could not check Coach settings.");
        const validStatuses: CoachStatus[] = ["ready", "signed_out", "profile_missing", "consent_required", "key_missing"];
        setStatus(validStatuses.includes(result.status as CoachStatus) ? result.status as CoachStatus : "error");
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "Could not check Coach settings.");
      });
    return () => controller.abort();
  }, [open, pathname]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(message);
  }

  async function sendMessage(rawMessage: string) {
    const content = rawMessage.trim();
    if (!content || pending || status !== "ready") return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    const requestMessages = nextMessages.slice(-12);
    if (requestMessages[0]?.role === "assistant") requestMessages.shift();
    setMessages(nextMessages);
    setMessage("");
    setError("");
    setLastFailedMessage("");
    setPending(true);
    try {
      const response = await fetch("/api/fitlog-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages.map(({ role, content: text }) => ({ role, content: text })) }),
      });
      const result = await response.json() as { reply?: unknown; evidence?: unknown; error?: string; remainingReplies?: unknown };
      if (response.status === 429) setRemainingReplies(0);
      if (!response.ok) throw new Error(result.error || "FitLog Coach could not reply. Please try again.");
      if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("FitLog Coach returned an unreadable reply.");
      const evidence = isCoachEvidence(result.evidence) ? result.evidence : [];
      if (typeof result.remainingReplies === "number") setRemainingReplies(result.remainingReplies);
      setMessages((current) => [...current, { role: "assistant" as const, content: result.reply as string, evidence }].slice(-12));
    } catch (reason) {
      setMessages((current) => current.slice(0, -1));
      setMessage(content);
      setLastFailedMessage(content);
      setError(reason instanceof Error ? reason.message : "FitLog Coach could not reply. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function clearChat() {
    if (!window.confirm("Clear this temporary Coach chat? This cannot be undone.")) return;
    setMessages([]);
    setMessage("");
    setError("");
    setLastFailedMessage("");
  }

  const userTurns = messages.filter((item) => item.role === "user").length;
  const limitLabel = remainingReplies === null
    ? null
    : `${remainingReplies} Coach ${remainingReplies === 1 ? "reply" : "replies"} remaining this hour`;

  return (
    <>
      {open && (
        <section
          id="fitlog-coach-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="fitlog-coach-title"
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex max-h-[min(72svh,42rem)] flex-col overflow-hidden rounded-2xl border border-[#e6e3da] bg-[#fffefa] shadow-[0_16px_60px_rgb(47_48_36_/_18%)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[min(25rem,calc(100vw-2rem))] sm:max-h-[min(70svh,42rem)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[#efede7] bg-[#fffefa] px-4 py-3">
            <div>
              <p className="fit-eyebrow">Your read-only companion</p>
              <h2 id="fitlog-coach-title" className="mt-1 text-xl">FitLog Coach</h2>
              <p className="mt-1 text-xs leading-5 text-[#7b8077]">Ask about your plan, today’s logs, or recent patterns.</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {(messages.length > 0 || lastFailedMessage) && (
                <button type="button" onClick={clearChat} className="rounded-lg px-2 py-2 text-xs font-medium text-[#52644e] hover:bg-[#f5f7f2]">Clear</button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close FitLog Coach" className="grid size-10 place-items-center rounded-full text-xl text-[#697066] hover:bg-[#f5f7f2]">×</button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {status === "loading" && <p role="status" className="py-4 text-sm text-[#697066]">Checking Coach availability…</p>}
            {status === "error" && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error || "Could not check Coach settings. Please try again."}</p>
            )}
            {status === "signed_out" && (
              <p className="rounded-xl bg-[#f5f7f2] p-3 text-sm leading-6 text-[#62685f]">Sign in to chat with FitLog Coach about your personal progress. <Link href="/login" className="font-semibold text-[#3e5944] underline">Sign in</Link>.</p>
            )}
            {status === "profile_missing" && (
              <p className="rounded-xl bg-[#f5f7f2] p-3 text-sm leading-6 text-[#62685f]">Finish setting up your profile to give Coach the context it needs. <Link href="/onboarding" className="font-semibold text-[#3e5944] underline">Set up profile</Link>.</p>
            )}
            {status === "consent_required" && (
              <p className="rounded-xl bg-[#f5f7f2] p-3 text-sm leading-6 text-[#62685f]">Coach is off until you opt in. <Link href="/settings#fitlog-coach-consent" className="font-semibold text-[#3e5944] underline">Review and enable it in Settings</Link>.</p>
            )}
            {status === "key_missing" && (
              <p className="rounded-xl bg-[#f5f7f2] p-3 text-sm leading-6 text-[#62685f]">Add a Gemini API key in <Link href="/settings#gemini-key" className="font-semibold text-[#3e5944] underline">Settings</Link>, or ask the FitLog administrator to configure a shared key.</p>
            )}
            {status === "ready" && (
              <>
                {messages.length === 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[#7b8077]">Try asking</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <button key={question} type="button" onClick={() => setMessage(question)} className="rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-left text-xs font-medium text-[#52644e] transition-colors hover:bg-[#f5f7f2]">{question}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.length > 0 && <p className="mb-3 text-xs text-[#81877e]">Recent context: {Math.min(6, userTurns)} of 6 turns. Older turns are dropped.</p>}
                {limitLabel && <p className="mb-2 text-xs text-[#81877e]">{limitLabel}</p>}
                <div className="space-y-3" aria-live="polite">
                  {messages.map((item, index) => (
                    <article key={`${index}-${item.role}`} className={item.role === "user" ? "ml-4 rounded-xl bg-[#edf1e9] p-3 sm:ml-8" : "mr-4 rounded-xl bg-[#f5f7f2] p-3 sm:mr-8"}>
                      <p className="mb-1 text-xs font-semibold text-[#52644e]">{item.role === "user" ? "You" : "FitLog Coach"}</p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#454c42]">{item.content}</p>
                      {item.role === "assistant" && item.evidence && item.evidence.length > 0 && (
                        <details className="mt-3 border-t border-[#e6e9e1] pt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-[#52644e]">Data used for this reply</summary>
                          <ul className="mt-2 space-y-1 text-xs leading-5 text-[#697066]">
                            {item.evidence.map((fact) => <li key={`${fact.label}-${fact.value}`}><span className="font-semibold">{fact.label}:</span> {fact.value}</li>)}
                          </ul>
                        </details>
                      )}
                    </article>
                  ))}
                  {pending && <p role="status" className="text-sm text-[#7b8077]">FitLog Coach is thinking…</p>}
                  <div ref={conversationEnd} />
                </div>
              </>
            )}
          </div>

          {status === "ready" && (
            <div className="border-t border-[#efede7] bg-[#fffefa] px-4 py-3">
              {error && (
                <div className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  <p role="alert">{error}</p>
                  {lastFailedMessage && <button type="button" onClick={() => sendMessage(lastFailedMessage)} disabled={pending} className="mt-2 font-semibold underline disabled:opacity-60">Retry last message</button>}
                </div>
              )}
              <form onSubmit={send} className="flex items-end gap-2">
                <label className="sr-only" htmlFor="fitlog-coach-message">Ask FitLog Coach</label>
                <textarea id="fitlog-coach-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} rows={2} placeholder="Ask about your progress…" className="fit-input min-h-12 min-w-0 flex-1 resize-y" disabled={pending} />
                <button type="submit" disabled={pending || !message.trim()} className="fit-button-primary min-h-12 shrink-0 px-3 disabled:cursor-wait disabled:opacity-60">{pending ? "…" : "Ask"}</button>
              </form>
              <details className="mt-2 text-xs leading-5 text-[#81877e]">
                <summary className="cursor-pointer">Privacy and data used</summary>
                <p className="mt-1">When you send a message, your profile, today’s food and exercise logs, recent seven-day trends, and weigh-ins from the past two weeks are sent to Gemini. Follow-ups include this temporary chat. FitLog does not save chat history to your account. Limit: 10 replies per hour. Gemini’s data policies apply.</p>
              </details>
            </div>
          )}
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="fitlog-coach-panel"
        aria-label={open ? "Close FitLog Coach" : "Chat with FitLog Coach"}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-[#3e5944] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(47_48_36_/_22%)] transition hover:bg-[#304837] focus-visible:outline-white sm:bottom-6 sm:right-6"
      >
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-white/15 text-lg">✳</span>
        <span>{open ? "Close Coach" : "Ask Coach"}</span>
      </button>
    </>
  );
}

function isCoachEvidence(value: unknown): value is CoachEvidence[] {
  return Array.isArray(value) && value.every((item) =>
    item !== null &&
    typeof item === "object" &&
    "label" in item &&
    "value" in item &&
    typeof item.label === "string" &&
    typeof item.value === "string",
  );
}
