export const quickAddMeals = ["breakfast", "lunch", "snack", "dinner"] as const;
export const quickAddNumbers = ["calories", "protein_g", "carbs_g", "fat_g"] as const;

export type QuickAddValues = Record<(typeof quickAddNumbers)[number], number>;

export function isValidQuickAdd(name: string, meal: string, values: QuickAddValues) {
  return name.trim().length >= 1 &&
    name.trim().length <= 100 &&
    quickAddMeals.includes(meal as (typeof quickAddMeals)[number]) &&
    quickAddNumbers.every((key) =>
      Number.isFinite(values[key]) &&
      values[key] >= 0 &&
      values[key] <= (key === "calories" ? 20000 : 1000),
    ) &&
    Number.isInteger(values.calories);
}
