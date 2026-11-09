"use client";

import { useState } from "react";
import type { MealIdea } from "@/lib/meal-ideas";

export function MealIdeas({ enabled }: { enabled: boolean }) {
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);

  async function getIdeas() {
    setPending(true);
    setMessage("");
    setIdeas([]);
    try {
      const response = await fetch("/api/meal-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json() as { ideas?: MealIdea[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not create meal ideas.");
      if (!Array.isArray(result.ideas) || result.ideas.length !== 3) throw new Error("Gemini returned unreadable meal ideas.");
      setIdeas(result.ideas);
      setMessageIsError(false);
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not create meal ideas. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="fit-card mt-6" aria-labelledby="meal-ideas-title">
      <p className="fit-eyebrow">Optional inspiration</p>
      <h2 id="meal-ideas-title" className="mt-2 text-2xl">Ideas for later today</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7b8077]">
        Suggestions use today’s logged calorie and protein totals and your saved favorites as inspiration. Every nutrition value is an estimate; nothing is added to your journal.
      </p>
      {!enabled ? (
        <p className="mt-4 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]">
          This is off by default. You can enable Gemini meal ideas in <a className="font-semibold text-[#3e5944] underline" href="/profile#ai-food">Profile → AI food tools</a>.
        </p>
      ) : (
        <>
          <button type="button" onClick={getIdeas} disabled={pending} className="fit-button-primary mt-4 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Finding ideas…" : ideas.length ? "Suggest different ideas" : "Suggest meal ideas"}
          </button>
          {message && <p role={messageIsError ? "alert" : "status"} className="mt-4 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">{message}</p>}
          {ideas.length > 0 && (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {ideas.map((idea, index) => (
                <article key={`${index}-${idea.name}`} className="rounded-xl border border-[#e6e3da] bg-[#faf9f5] p-4">
                  <h3 className="font-semibold text-[#35483a]">{idea.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#62685f]">{idea.description}</p>
                  <p className="mt-3 border-t border-[#e6e3da] pt-3 text-xs leading-5 text-[#697066]">
                    Estimated: {Math.round(idea.nutrition.calories)} kcal · {Math.round(idea.nutrition.protein_g)} g protein · {Math.round(idea.nutrition.carbs_g)} g carbs · {Math.round(idea.nutrition.fat_g)} g fat
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-xs leading-5 text-[#81877e]">These are optional ideas, not a plan or medical advice. Estimates can be inaccurate; review and log food yourself if you choose.</p>
    </section>
  );
}
