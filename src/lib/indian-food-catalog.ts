export type IndianFood = {
  code: string;
  name: string;
  localNames: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type FoodNutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function formatIndianFoodEntryName(name: string, portionGrams: string | null): string | null {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 100) return null;
  if (portionGrams === null || portionGrams === "") return cleanName;
  if (!/^\d{1,4}$/.test(portionGrams)) return null;

  const grams = Number(portionGrams);
  if (!Number.isInteger(grams) || grams < 1 || grams > 5000) return null;
  const withPortion = `${cleanName} (${grams} g)`;
  return withPortion.length <= 100 ? withPortion : null;
}

export function searchIndianFoods(foods: readonly IndianFood[], query: string, limit = 8): IndianFood[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery || limit <= 0) return [];

  return foods
    .map((food, index) => {
      const name = food.name.toLocaleLowerCase();
      const localNames = food.localNames.toLocaleLowerCase();
      const relevance = name === normalizedQuery ? 0
        : name.startsWith(normalizedQuery) ? 1
          : name.includes(normalizedQuery) ? 2
            : localNames.includes(normalizedQuery) ? 3
              : Number.POSITIVE_INFINITY;
      return { food, index, relevance };
    })
    .filter((result) => Number.isFinite(result.relevance))
    .sort((left, right) => left.relevance - right.relevance || left.index - right.index)
    .slice(0, limit)
    .map(({ food }) => food);
}

export function scaleIndianFoodNutrition(food: IndianFood, portionGrams: number): FoodNutrition | null {
  if (!Number.isFinite(portionGrams) || portionGrams <= 0) return null;
  const factor = portionGrams / 100;
  return {
    calories: Math.round(food.kcalPer100g * factor),
    protein_g: Number((food.proteinPer100g * factor).toFixed(1)),
    carbs_g: Number((food.carbsPer100g * factor).toFixed(1)),
    fat_g: Number((food.fatPer100g * factor).toFixed(1)),
  };
}
