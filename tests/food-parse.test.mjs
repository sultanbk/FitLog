import assert from "node:assert/strict";
import { test } from "node:test";
import { isFoodParseResult } from "../src/lib/food-parse.ts";

const food = {
  name: "Rice",
  serving_description: "1 medium bowl",
  meal: "lunch",
  calories: 220,
  protein_g: 4,
  carbs_g: 48,
  fat_g: 0.5,
  is_guessed: true,
};

test("food parser accepts a single follow-up question with no premature estimates", () => {
  assert.equal(isFoodParseResult({
    items: [],
    clarificationQuestion: "About how many cups of rice were in the bowl?",
  }), true);
  assert.equal(isFoodParseResult({
    items: [food],
    clarificationQuestion: "How much rice?",
  }), false);
});

test("food parser accepts strict item data after clarification or for a marked estimate", () => {
  assert.equal(isFoodParseResult({ items: [food], clarificationQuestion: "" }), true);
  assert.equal(isFoodParseResult({ items: [{ ...food, is_guessed: false }], clarificationQuestion: "" }), true);
  assert.equal(isFoodParseResult({ items: [], clarificationQuestion: "" }), false);
  assert.equal(isFoodParseResult({
    items: [],
    clarificationQuestion: "How much?",
    extra: "unexpected",
  }), false);
});

test("food parser rejects malformed nutrition and oversized follow-up questions", () => {
  assert.equal(isFoodParseResult({
    items: [{ ...food, calories: 20000.5 }],
    clarificationQuestion: "",
  }), false);
  assert.equal(isFoodParseResult({
    items: [],
    clarificationQuestion: "x".repeat(201),
  }), false);
});
