"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { CoachEvidence, CoachMessage } from "@/lib/coach";

type DisplayMessage = CoachMessage & { evidence?: CoachEvidence[] };

const suggestedQuestions = [
  "Summarize what I logged today.",
  "Which days did I log food this week?",
  "What activity did I log over the past week?",
];

export function FitLogCoach({ consented, available }: { consented: boolean; available: boolean }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [remainingReplies, setRemainingReplies] = useState<number | null>(null);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(message);
  }

  async function sendMessage(rawMessage: string) {
    const content = rawMessage.trim();
    if (!content || pending) return;
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
  const contextTurns = Math.min(6, userTurns);
  const limitLabel = remainingReplies === null
    ? null
    : `${remainingReplies} Coach ${remainingReplies === 1 ? "reply" : "replies"} remaining this hour`;

  return (
    <section className="fit-card mt-5" aria-labelledby="fitlog-coach-title">
      <p className="fit-eyebrow">A read-only companion</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="fitlog-coach-title" className="text-2xl">FitLog Coach</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">Ask about your plan, today’s entries, or recent patterns. Coach can explain your data, but cannot change your goals or logs.</p>
        </div>
        {(messages.length > 0 || lastFailedMessage) && <button type="button" onClick={clearChat} className="rounded-lg border border-[#d9d7cd] px-3 py-2 text-sm font-medium text-[#3e5944] hover:bg-[#f5f7f2]">Clear chat</button>}
      </div>

      {!consented ? (
        <div className="mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]">
          FitLog Coach is off until you opt in. <Link href="/settings#fitlog-coach-consent" className="font-semibold text-[#3e5944] underline">Review and enable it in Settings</Link>.
        </div>
      ) : !available ? (
        <p className="mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]">
          Add a personal Gemini API key in <Link href="/settings#gemini-key" className="font-semibold text-[#3e5944] underline">Settings</Link> or ask the FitLog administrator to configure a shared key.
        </p>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[#7b8077]">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => setMessage(question)} className="rounded-full border border-[#e6e3da] bg-[#fffefa] px-3 py-2 text-left text-xs font-medium text-[#52644e] transition-colors hover:bg-[#f5f7f2]">{question}</button>
                ))}
              </div>
            </div>
          )}
          {messages.length > 0 && <p className="mt-4 text-xs text-[#81877e]">Recent context: {contextTurns} of 6 turns. Older turns are dropped from the conversation context.</p>}
          {limitLabel && <p className="mt-1 text-xs text-[#81877e]">{limitLabel}</p>}
          <div className="mt-4 space-y-3" aria-live="polite">
            {messages.map((item, index) => (
              <article key={`${index}-${item.role}`} className={item.role === "user" ? "ml-4 rounded-xl bg-[#edf1e9] p-3 sm:ml-12" : "mr-4 rounded-xl bg-[#f5f7f2] p-3 sm:mr-12"}>
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
          </div>
          {error && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <p role="alert">{error}</p>
              {lastFailedMessage && <button type="button" onClick={() => sendMessage(lastFailedMessage)} disabled={pending} className="mt-2 font-semibold underline disabled:opacity-60">Retry last message</button>}
            </div>
          )}
          <form onSubmit={send} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="fitlog-coach-message">Ask FitLog Coach</label>
            <textarea id="fitlog-coach-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} rows={2} placeholder="Ask a question about your progress…" className="fit-input min-h-12 flex-1 resize-y" disabled={pending} />
            <button type="submit" disabled={pending || !message.trim()} className="fit-button-primary min-h-12 disabled:cursor-wait disabled:opacity-60">{pending ? "Sending…" : "Ask Coach"}</button>
          </form>
          <p className="mt-3 text-xs leading-5 text-[#81877e]">Each message sends your profile, today’s food and exercise entries, and recent seven-day trends (including weigh-ins from the past two weeks) to Gemini. Follow-up messages also include this page’s conversation for context. FitLog keeps chat history only in this page and does not save it to your account; it disappears when you leave or clear the chat. Limit: 10 replies per hour. Gemini’s data policies apply.</p>
        </>
      )}
    </section>
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
