"use client";

import { useState } from "react";
import type { WeeklyReflection } from "@/lib/weekly-reflection";

type Result = { reflection: WeeklyReflection } | { insufficientData: true; message: string };

export function WeeklyReflectionCard({ enabled }: { enabled: boolean }) {
  const [reflection, setReflection] = useState<WeeklyReflection | null>(null);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);

  async function generateReflection() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/weekly-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json() as Result | { error?: string };
      if (!response.ok) throw new Error(result && "error" in result ? result.error || "Could not create your reflection." : "Could not create your reflection.");
      if ("insufficientData" in result && result.insufficientData) {
        setReflection(null);
        setMessageIsError(false);
        setMessage(result.message);
      } else if ("reflection" in result) {
        setMessageIsError(false);
        setReflection(result.reflection);
      } else {
        throw new Error("Gemini returned an unreadable reflection.");
      }
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not create your reflection. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="fit-card mt-5" aria-labelledby="weekly-reflection-title">
      <p className="fit-eyebrow">A gentle look back</p>
      <h2 id="weekly-reflection-title" className="mt-2 text-2xl">Weekly reflection</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">
        An optional recap of your recent logging, generated only when you ask. FitLog sends Gemini seven-day totals and weekday logging counts—not food names, individual entries, or weight.
      </p>
      {!enabled ? (
        <p className="mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]">
          This is off by default. You can enable weekly reflections in <a className="font-semibold text-[#3e5944] underline" href="/profile#ai-food">Profile → AI food tools</a>.
        </p>
      ) : (
        <>
          <button type="button" onClick={generateReflection} disabled={pending} className="fit-button-primary mt-4 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Creating reflection…" : reflection ? "Refresh reflection" : "Create my reflection"}
          </button>
          {message && <p role={messageIsError ? "alert" : "status"} className={messageIsError ? "mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700" : "mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]"}>{message}</p>}
          {reflection && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ReflectionPart title="Your week" text={reflection.recap} />
              <ReflectionPart title="A pattern" text={reflection.pattern} />
              <ReflectionPart title="One gentle idea" text={reflection.tryNextWeek} />
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-xs leading-5 text-[#81877e]">This is a non-medical reflection, not advice. It is not saved and you can generate another whenever you like.</p>
    </section>
  );
}

function ReflectionPart({ title, text }: { title: string; text: string }) {
  return <article className="rounded-xl bg-[#f5f7f2] p-4">
    <h3 className="text-sm font-semibold text-[#35483a]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[#62685f]">{text}</p>
  </article>;
}
