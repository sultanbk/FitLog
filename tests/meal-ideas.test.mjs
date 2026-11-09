import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMealIdeaContext, isMealIdeaResponse } from "../src/lib/meal-ideas.ts";

test("meal ideas context computes remaining targets from aggregate logged nutrition", () => {
  assert.deepEqual(buildMealIdeaContext(2000, 100, [
    { calories: 500, protein_g: 25 },
    { calories: 700, protein_g: 30 },
  ], ["Oats", "Dal"]), {
    calorieTarget: 2000,
    proteinTarget: 100,
    caloriesLogged: 1200,
    proteinLogged: 55,
    caloriesRemaining: 800,
    proteinRemaining: 45,
    favorites: ["Oats", "Dal"],
  });
});

test("meal ideas remaining targets never become negative", () => {
  const context = buildMealIdeaContext(1800, 90, [
    { calories: 1900, protein_g: 100 },
  ], []);
  assert.equal(context.caloriesRemaining, 0);
  assert.equal(context.proteinRemaining, 0);
});

test("meal ideas validate exactly three fully estimated suggestions", () => {
  const ideas = {
    ideas: Array.from({ length: 3 }, (_, index) => ({
      name: `Meal ${index + 1}`,
      description: "A simple meal with a few ingredients.",
      nutrition: { calories: 400, protein_g: 20, carbs_g: 45, fat_g: 12 },
    })),
  };
  assert.equal(isMealIdeaResponse(ideas), true);
  assert.equal(isMealIdeaResponse({ ideas: ideas.ideas.slice(0, 2) }), false);
  assert.equal(isMealIdeaResponse({
    ideas: ideas.ideas.map((idea, index) => index === 0
      ? { ...idea, nutrition: { ...idea.nutrition, calories: 6000 } }
      : idea),
  }), false);
  assert.equal(isMealIdeaResponse({
    ideas: ideas.ideas.map((idea, index) => index === 0
      ? { ...idea, nutrition: { ...idea.nutrition, calories: 400.5 } }
      : idea),
  }), false);
  assert.equal(isMealIdeaResponse({ ...ideas, extra: "unexpected" }), false);
});
