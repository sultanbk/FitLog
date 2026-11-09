"use client";

import Link from "next/link";
import { useState } from "react";

type Food = { name: string; serving_description: string; meal: "breakfast" | "lunch" | "snack" | "dinner"; calories: number; protein_g: number; carbs_g: number; fat_g: number; is_guessed: boolean; remember: boolean };
const meals = ["breakfast", "lunch", "snack", "dinner"] as const;

export function NaturalLanguageLogger({ day, enabled }: { day: string; enabled: boolean }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Food[]>([]);
  const [message, setMessage] = useState("");
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);

  async function runParse(clarificationAnswer?: string) {
    setBusy(true); setMessage(""); setItems([]);
    try {
      const response = await fetch("/api/food-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...(clarificationAnswer ? { clarificationAnswer } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not parse this food log.");
      if (typeof result.clarificationQuestion === "string" && result.clarificationQuestion) {
        setClarificationQuestion(result.clarificationQuestion);
        setMemoryEnabled(result.memoryEnabled === true);
        return;
      }
      setClarificationQuestion("");
      if (!result.items.length) { setMessage("I couldn't find any foods in that text. Try describing a meal and portion."); return; }
      setItems(result.items.map((item: Omit<Food, "remember">) => ({ ...item, remember: false })));
      setMemoryEnabled(result.memoryEnabled === true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not parse this food log."); }
    finally { setBusy(false); }
  }

  async function parse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClarificationQuestion("");
    await runParse();
  }

  async function answerClarification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = new FormData(event.currentTarget).get("portion_answer");
    if (typeof answer !== "string" || !answer.trim()) {
      setMessage("Add a quick portion detail or choose to estimate.");
      return;
    }
    await runParse(answer.trim());
  }

  function update(index: number, key: keyof Food, value: string | boolean) {
    setItems((previous) => previous.map((item, current) => current === index ? { ...item, [key]: key === "name" || key === "meal" || key === "is_guessed" || key === "remember" ? value : Number(value) } as Food : item));
  }

  async function save() {
    if (items.some((item) => !item.name.trim() || !item.serving_description.trim() || item.name.trim().length + item.serving_description.trim().length + 3 > 100 || !Number.isInteger(item.calories) || item.calories < 0 || item.calories > 20000 || [item.protein_g, item.carbs_g, item.fat_g].some((number) => !Number.isFinite(number) || number < 0 || number > 1000))) {
      setMessage("Check each name and nutrition value before saving."); return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/food-entries/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entry_date: day, items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save the food entries. Please try again.");
      const notice = new URLSearchParams({ day, saved: "1", notice: "food-added" });
      if (result.memoryWarning) notice.set("memoryWarning", result.memoryWarning);
      sessionStorage.removeItem(`fitlog-form-draft:food-description:${day}`);
      window.location.assign(`/today?${notice.toString()}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the food entries."); setBusy(false); }
  }

  return (
    <div className="mt-5">
      {!enabled ? (
        <p className="rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#62685f]">
          Add a personal Gemini API key in <Link className="font-semibold text-[#3e5944] underline" href="/settings#gemini-key">Settings</Link> to enable food estimates. You can still add food manually below.
        </p>
      ) : (
      <form onSubmit={parse} data-draft-key={`food-description:${day}`} className="space-y-3" aria-busy={busy}>
        <p data-draft-status className="text-xs text-[#7b8077]">Your unfinished description is saved only in this browser tab.</p>
        <label htmlFor="food-log-text" className="block text-sm font-medium text-[#62685f]">Describe what you ate</label>
        <textarea id="food-log-text" name="food_description" data-draft-field required minLength={2} maxLength={5000} value={text} onChange={(event) => setText(event.target.value)} rows={4} placeholder="For example: Breakfast: 2 eggs and 2 slices of toast. Lunch: rice, dal, and a cup of curd." className="fit-input resize-y text-sm" />
        <button disabled={busy} className="fit-button-primary min-h-12 w-full disabled:opacity-60">{busy ? "Working…" : "Estimate this meal"}</button>
      </form>
      )}
      {message && <p role="alert" className="fit-warning mt-3 p-3 text-sm">{message}</p>}
      {items.length > 0 && (
        <section className="mt-5 border-t border-[#efede7] pt-5">
          <div>
            <h3 className="text-xl">Review before saving</h3>
            <p className="mt-1 text-sm leading-6 text-[#7b8077]">Check portions and nutrition. Guessed estimates are marked; nothing is saved until you confirm these entries.</p>
          </div>
          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <article key={`${index}-${item.name}`} className="rounded-xl border border-[#e6e3da] bg-[#faf9f5] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#7b8077]">Entry {index + 1} {item.is_guessed && <span className="ml-1 rounded-full bg-[#fff3cf] px-2 py-1 text-[10px] tracking-normal text-[#795b15]">Estimate · check portion</span>}</span>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setItems((previous) => previous.filter((_, current) => current !== index))} className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Remove</button>
                </div>
                <label className="mt-3 block text-xs font-medium text-[#62685f]">Food<input value={item.name} onChange={(event) => update(index, "name", event.target.value)} maxLength={70} className="fit-input mt-1 text-sm" /></label>
                <label className="mt-3 block text-xs font-medium text-[#62685f]">Serving or amount<input value={item.serving_description} onChange={(event) => update(index, "serving_description", event.target.value)} maxLength={30} className="fit-input mt-1 text-sm" /></label>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="text-xs text-[#62685f]">Meal<select value={item.meal} onChange={(event) => update(index, "meal", event.target.value)} className="fit-input mt-1 text-sm">{meals.map((meal) => <option key={meal} value={meal}>{meal[0].toUpperCase() + meal.slice(1)}</option>)}</select></label>
                  <NumberInput label="Calories" value={item.calories} onChange={(value) => update(index, "calories", value)} integer />
                  <NumberInput label="Protein g" value={item.protein_g} onChange={(value) => update(index, "protein_g", value)} />
                  <NumberInput label="Carbs g" value={item.carbs_g} onChange={(value) => update(index, "carbs_g", value)} />
                  <NumberInput label="Fat g" value={item.fat_g} onChange={(value) => update(index, "fat_g", value)} />
                </div>
                <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#76591e]"><input type="checkbox" checked={item.is_guessed} onChange={(event) => update(index, "is_guessed", event.target.checked)} /> These values are guessed or still need checking</label>
                <label className={`mt-3 flex items-start gap-2 text-xs leading-5 ${memoryEnabled && !item.is_guessed ? "text-[#3e5944]" : "text-[#7b8077]"}`}><input type="checkbox" checked={item.remember} disabled={!memoryEnabled || item.is_guessed} onChange={(event) => update(index, "remember", event.target.checked)} /> Remember these confirmed values for this food and serving{!memoryEnabled && <Link href="/profile#food-memory" className="underline">Enable memory in Profile</Link>}{memoryEnabled && item.is_guessed && <span>First verify the portion and values, then uncheck “guessed” to save them as a memory.</span>}</label>
              </article>
            )            )}
            {clarificationQuestion && (
              <form onSubmit={answerClarification} className="mt-4 rounded-xl border border-[#e6e3da] bg-[#f5f7f2] p-4" aria-busy={busy}>
                <label htmlFor="food-portion-answer" className="block text-sm font-semibold text-[#35483a]">{clarificationQuestion}</label>
                <p className="mt-1 text-xs leading-5 text-[#7b8077]">One quick detail helps make the estimate more useful. You can also skip this and review a clearly marked estimate.</p>
                <input id="food-portion-answer" name="portion_answer" maxLength={250} autoComplete="off" enterKeyHint="done" placeholder="e.g. about 1 cup, medium bowl" className="fit-input mt-3 text-sm" disabled={busy} />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button disabled={busy} className="fit-button-primary min-h-12 w-full sm:w-auto disabled:opacity-60">{busy ? "Updating estimate…" : "Continue with this portion"}</button>
                  <button type="button" disabled={busy} onClick={() => runParse("I’m not sure; use a clearly marked estimate.")} className="min-h-12 w-full rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-2 text-sm text-[#62685f] disabled:opacity-60 sm:w-auto">Estimate it instead</button>
                </div>
              </form>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={busy || items.length === 0} onClick={save} className="fit-button-primary min-h-12 w-full flex-1 disabled:opacity-60">{busy ? "Saving…" : `Save ${items.length} ${items.length === 1 ? "entry" : "entries"}`}</button>
            <button type="button" disabled={busy} onClick={() => setItems([])} className="min-h-12 w-full rounded-lg border border-[#d9d7cd] bg-[#fffefa] px-4 py-3 text-sm text-[#62685f] sm:w-auto">Clear review</button>
          </div>
        </section>
      )}
    </div>
  );
}

function NumberInput({ label, value, onChange, integer }: { label: string; value: number; onChange: (value: string) => void; integer?: boolean }) { return <label className="text-xs text-[#62685f]">{label}<input type="number" inputMode={integer ? "numeric" : "decimal"} enterKeyHint="done" min="0" max={integer ? 20000 : 1000} step={integer ? 1 : "0.1"} value={value} onChange={(event) => onChange(event.target.value)} className="fit-input mt-1 text-sm" /></label>; }
