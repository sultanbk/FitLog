import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  formatIndianFoodEntryName,
  scaleIndianFoodNutrition,
  searchIndianFoods,
} from "../src/lib/indian-food-catalog.ts";

const foods = JSON.parse(await readFile(new URL("../src/data/ifct2017-foods.json", import.meta.url), "utf8"));

test("the local IFCT catalog contains 528 measured Indian food records", () => {
  assert.equal(foods.length, 528);
  assert.equal(new Set(foods.map((food) => food.code)).size, foods.length);
  for (const food of foods) {
    assert.equal(typeof food.name, "string");
    assert.ok(food.name.length > 0);
    assert.ok(Number.isFinite(food.kcalPer100g) && food.kcalPer100g > 0);
    assert.ok(Number.isFinite(food.proteinPer100g) && food.proteinPer100g >= 0);
    assert.ok(Number.isFinite(food.carbsPer100g) && food.carbsPer100g >= 0);
    assert.ok(Number.isFinite(food.fatPer100g) && food.fatPer100g >= 0);
  }
});

test("food search prioritizes exact English matches and finds regional names", () => {
  assert.equal(searchIndianFoods(foods, "Bajra")[0].name, "Bajra");
  assert.ok(searchIndianFoods(foods, "Gai ka doodh").some((food) => food.code === "L002"));
  assert.deepEqual(searchIndianFoods(foods, "  "), []);
  assert.equal(searchIndianFoods(foods, "rice", 3).length, 3);
});

test("catalog nutrition scales to grams and rejects invalid portions", () => {
  const bajra = foods.find((food) => food.name === "Bajra");
  assert.ok(bajra);
  assert.deepEqual(scaleIndianFoodNutrition(bajra, 100), {
    calories: Math.round(bajra.kcalPer100g),
    protein_g: bajra.proteinPer100g,
    carbs_g: bajra.carbsPer100g,
    fat_g: bajra.fatPer100g,
  });
  assert.deepEqual(scaleIndianFoodNutrition(bajra, 150), {
    calories: Math.round(bajra.kcalPer100g * 1.5),
    protein_g: Number((bajra.proteinPer100g * 1.5).toFixed(1)),
    carbs_g: Number((bajra.carbsPer100g * 1.5).toFixed(1)),
    fat_g: Number((bajra.fatPer100g * 1.5).toFixed(1)),
  });
  assert.equal(scaleIndianFoodNutrition(bajra, 0), null);
  assert.equal(scaleIndianFoodNutrition(bajra, Number.NaN), null);
});

test("food entry names retain an optional validated serving size", () => {
  assert.equal(formatIndianFoodEntryName(" Bajra ", "150"), "Bajra (150 g)");
  assert.equal(formatIndianFoodEntryName("Homemade meal", null), "Homemade meal");
  assert.equal(formatIndianFoodEntryName("Bajra", ""), "Bajra");
  assert.equal(formatIndianFoodEntryName("Bajra", "1.5"), null);
  assert.equal(formatIndianFoodEntryName("Bajra", "5001"), null);
  assert.equal(formatIndianFoodEntryName("x".repeat(95), "100"), null);
});

test("the IFCT attribution and MIT license are included", async () => {
  const license = await readFile(new URL("../src/data/IFCT2017-LICENSE.txt", import.meta.url), "utf8");
  assert.match(license, /@ifct2017\/compositions version 2\.0\.9/);
  assert.match(license, /MIT License/);
  assert.match(license, /National Institute of Nutrition/);
});
