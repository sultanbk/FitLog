import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidQuickAdd } from "../src/lib/quick-adds.ts";

const validValues = { calories: 450, protein_g: 20.5, carbs_g: 50, fat_g: 12 };

test("favorite details accept valid values and all supported meals", () => {
  for (const meal of ["breakfast", "lunch", "snack", "dinner"]) {
    assert.equal(isValidQuickAdd("Oats with milk", meal, validValues), true);
  }
});

test("favorite details reject invalid names, meals, and out-of-range nutrition", () => {
  assert.equal(isValidQuickAdd("  ", "breakfast", validValues), false);
  assert.equal(isValidQuickAdd("x".repeat(101), "breakfast", validValues), false);
  assert.equal(isValidQuickAdd("Oats", "brunch", validValues), false);
  assert.equal(isValidQuickAdd("Oats", "breakfast", { ...validValues, calories: 20000.5 }), false);
  assert.equal(isValidQuickAdd("Oats", "breakfast", { ...validValues, protein_g: 1001 }), false);
  assert.equal(isValidQuickAdd("Oats", "breakfast", { ...validValues, fat_g: Number.NaN }), false);
});
