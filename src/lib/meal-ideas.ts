export type MealIdeaNutrition = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealIdea = {
  name: string;
  description: string;
  nutrition: MealIdeaNutrition;
};

export type MealIdeaContext = {
  calorieTarget: number;
  proteinTarget: number;
  caloriesLogged: number;
  proteinLogged: number;
  caloriesRemaining: number;
  proteinRemaining: number;
  favorites: string[];
};

export function buildMealIdeaContext(
  calorieTarget: number,
  proteinTarget: number,
  entries: { calories: number; protein_g: number }[],
  favorites: string[],
): MealIdeaContext {
  const caloriesLogged = entries.reduce((sum, entry) => sum + Number(entry.calories), 0);
  const proteinLogged = entries.reduce((sum, entry) => sum + Number(entry.protein_g), 0);
  return {
    calorieTarget,
    proteinTarget,
    caloriesLogged,
    proteinLogged,
    caloriesRemaining: Math.max(0, calorieTarget - caloriesLogged),
    proteinRemaining: Math.max(0, proteinTarget - proteinLogged),
    favorites: favorites.slice(0, 8),
  };
}

export function isMealIdeaResponse(value: unknown): value is { ideas: MealIdea[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (Object.keys(result).length !== 1 || !Array.isArray(result.ideas) || result.ideas.length !== 3) return false;
  return result.ideas.every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const idea = value as Record<string, unknown>;
    if (Object.keys(idea).length !== 3 ||
        typeof idea.name !== "string" || idea.name.trim().length < 2 || idea.name.length > 70 ||
        typeof idea.description !== "string" || idea.description.trim().length < 8 || idea.description.length > 180 ||
        !idea.nutrition || typeof idea.nutrition !== "object" || Array.isArray(idea.nutrition)) return false;
    const nutrition = idea.nutrition as Record<string, unknown>;
    const nutritionKeys = ["calories", "protein_g", "carbs_g", "fat_g"];
    return Object.keys(nutrition).length === nutritionKeys.length &&
      nutritionKeys.every((key) => Object.hasOwn(nutrition, key) &&
        typeof nutrition[key] === "number" &&
        Number.isFinite(nutrition[key]) &&
        (key !== "calories" || Number.isInteger(nutrition[key])) &&
        nutrition[key] >= 0 &&
        nutrition[key] <= (key === "calories" ? 5000 : 300));
  });
}
