import type { QuickAdd } from "@/lib/demo-session";
import { quickAddMeals } from "@/lib/quick-adds";

const mealLabels: Record<(typeof quickAddMeals)[number], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export function QuickAddCard({ item, day }: { item: QuickAdd; day: string }) {
  return (
    <article className="rounded-xl border border-[#efede7] bg-[#faf9f5] px-3 py-2">
      <div className="flex items-center gap-2">
        <form action="/api/quick-adds" method="post" className="min-w-0 flex-1">
          <input type="hidden" name="action" value="add" />
          <input type="hidden" name="entry_date" value={day} />
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="name" value={item.name} />
          <input type="hidden" name="meal" value={item.meal} />
          <input type="hidden" name="calories" value={item.calories} />
          <input type="hidden" name="protein_g" value={item.protein_g} />
          <input type="hidden" name="carbs_g" value={item.carbs_g} />
          <input type="hidden" name="fat_g" value={item.fat_g} />
          <input type="hidden" name="is_guessed" value={item.is_guessed ? "true" : "false"} />
          <button data-pending-label="Adding…" className="flex min-h-0 w-full items-center gap-2 py-1 text-left">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {item.name} {item.is_guessed && <span className="text-xs text-[#76591e]">· Guessed</span>}
            </span>
            <span className="shrink-0 text-xs text-[#7b8077]">{mealLabels[item.meal]} · {item.calories} kcal</span>
            <span className="shrink-0 rounded-full bg-[#e9eee5] px-2.5 py-1 text-xs font-semibold text-[#3e5944]">Add</span>
          </button>
        </form>
        <form action="/api/quick-adds" method="post">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="entry_date" value={day} />
          <input type="hidden" name="id" value={item.id} />
          <button aria-label={`Remove ${item.name} from favorites`} data-pending-label="Removing…" className="min-h-0 rounded-lg px-2 py-1 text-xs text-[#81877e] hover:bg-red-50 hover:text-red-700">Remove</button>
        </form>
      </div>
      <details className="ml-1 mt-1">
        <summary className="w-fit cursor-pointer py-1 text-xs font-medium text-[#697066] hover:text-[#3e5944]">Edit details</summary>
        <p data-draft-status className="mt-2 text-xs text-[#7b8077]">Unfinished changes are saved only in this browser tab.</p>
        <form action="/api/quick-adds" method="post" data-draft-key={`favorite-edit:${item.id}`} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input type="hidden" name="action" value="edit" />
          <input type="hidden" name="entry_date" value={day} />
          <input type="hidden" name="id" value={item.id} />
          <label className="col-span-2 text-xs font-medium text-[#62685f] sm:col-span-3">Food name
            <input className="fit-input mt-1" name="name" required maxLength={100} defaultValue={item.name} />
          </label>
          <label className="text-xs font-medium text-[#62685f]">Meal
            <select className="fit-input mt-1" name="meal" defaultValue={item.meal}>
              {quickAddMeals.map((meal) => <option key={meal} value={meal}>{mealLabels[meal]}</option>)}
            </select>
          </label>
          <NumberField label="Calories (kcal)" name="calories" value={item.calories} max={20000} step={1} />
          <NumberField label="Protein (g)" name="protein_g" value={item.protein_g} max={1000} step={0.1} />
          <NumberField label="Carbs (g)" name="carbs_g" value={item.carbs_g} max={1000} step={0.1} />
          <NumberField label="Fat (g)" name="fat_g" value={item.fat_g} max={1000} step={0.1} />
          <label className="col-span-2 flex items-center gap-2 text-xs text-[#62685f] sm:col-span-4">
            <input type="checkbox" name="is_guessed" value="true" defaultChecked={item.is_guessed} />
            Mark nutrition as guessed
          </label>
          <button data-pending-label="Saving…" className="fit-button-primary col-span-2 sm:col-span-4">Save favorite</button>
        </form>
      </details>
    </article>
  );
}

function NumberField({ label, name, value, max, step }: { label: string; name: string; value: number; max: number; step: number }) {
  return (
    <label className="text-xs font-medium text-[#62685f]">{label}
      <input className="fit-input mt-1" name={name} type="number" inputMode={step === 1 ? "numeric" : "decimal"} required min="0" max={max} step={step} defaultValue={value} />
    </label>
  );
}
