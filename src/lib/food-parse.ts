export type ParsedFood = {
  name: string;
  serving_description: string;
  meal: "breakfast" | "lunch" | "snack" | "dinner";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_guessed: boolean;
};

export type FoodParseResult = {
  items: ParsedFood[];
  clarificationQuestion: string;
};

export function isFoodParseResult(value: unknown): value is FoodParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (Object.keys(result).length !== 2 ||
      !Object.hasOwn(result, "items") ||
      !Object.hasOwn(result, "clarificationQuestion") ||
      !Array.isArray(result.items) ||
      result.items.length > 30 ||
      !result.items.every(isParsedFood) ||
      typeof result.clarificationQuestion !== "string" ||
      result.clarificationQuestion.length > 200) return false;
  return result.clarificationQuestion.trim().length === 0
    ? result.items.length > 0
    : result.clarificationQuestion.trim().length >= 10 && result.items.length === 0;
}

function isParsedFood(value: unknown): value is ParsedFood {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const fields = ["name", "serving_description", "meal", "calories", "protein_g", "carbs_g", "fat_g", "is_guessed"];
  return Object.keys(item).length === fields.length && fields.every((field) => Object.hasOwn(item, field)) &&
    typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 70 &&
    typeof item.serving_description === "string" && item.serving_description.trim().length > 0 && item.serving_description.length <= 30 && item.name.length + item.serving_description.length + 3 <= 100 &&
    ["breakfast", "lunch", "snack", "dinner"].includes(String(item.meal)) && Number.isInteger(item.calories) && Number(item.calories) >= 0 && Number(item.calories) <= 20000 &&
    [item.protein_g, item.carbs_g, item.fat_g].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1000) &&
    typeof item.is_guessed === "boolean";
}
