"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  scaleIndianFoodNutrition,
  searchIndianFoods,
  type FoodNutrition,
  type IndianFood,
} from "@/lib/indian-food-catalog";

const emptyNutrition = { calories: "", protein_g: "", carbs_g: "", fat_g: "" };

export function IndianFoodPicker() {
  const [catalog, setCatalog] = useState<IndianFood[]>([]);
  const [query, setQuery] = useState("");
  const [foodName, setFoodName] = useState("");
  const [selectedFood, setSelectedFood] = useState<IndianFood | null>(null);
  const [portionGrams, setPortionGrams] = useState("");
  const [nutrition, setNutrition] = useState<Record<keyof FoodNutrition, string>>(emptyNutrition);
  const [needsChecking, setNeedsChecking] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (!showResults || query.trim().length < 2 || catalog.length > 0) return;
    let active = true;
    setCatalogLoading(true);
    import("@/lib/indian-food-data")
      .then(({ indianFoodCatalog }) => {
        if (active) setCatalog(indianFoodCatalog);
      })
      .catch((error: unknown) => {
        console.error("Could not load the local Indian food catalog", error);
        if (active) setCatalogError("The food catalog could not be loaded. You can still enter nutrition manually.");
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => { active = false; };
  }, [catalog.length, query, showResults]);

  const results = useMemo(() => searchIndianFoods(catalog, query), [catalog, query]);
  const listId = "indian-food-catalog-results";

  function chooseFood(food: IndianFood) {
    setSelectedFood(food);
    setFoodName(food.name);
    setPortionGrams("100");
    setNutrition(formatNutrition(scaleIndianFoodNutrition(food, 100)));
    setNeedsChecking(true);
    setQuery(food.name);
    setShowResults(false);
    setActiveResult(0);
  }

  function changePortion(event: ChangeEvent<HTMLInputElement>) {
    const grams = event.target.value;
    setPortionGrams(grams);
    const scaled = grams.trim() ? scaleIndianFoodNutrition(selectedFood!, Number(grams)) : null;
    setNutrition(formatNutrition(scaled));
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showResults || results.length === 0) {
      if (event.key === "Escape") setShowResults(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResult((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResult((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      chooseFood(results[activeResult]);
    } else if (event.key === "Escape") {
      setShowResults(false);
    }
  }

  return (
    <>
      <div className="col-span-2 relative sm:col-span-4">
        <label htmlFor="indian-food-search" className="text-xs font-medium text-[#62685f]">
          Find a measured Indian food or ingredient
        </label>
        <input
          id="indian-food-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults && query.trim().length >= 2}
          aria-controls={listId}
          aria-activedescendant={showResults && results[activeResult] ? `indian-food-${results[activeResult].code}` : undefined}
          value={query}
          onFocus={() => setShowResults(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowResults(true);
            setActiveResult(0);
          }}
          onKeyDown={handleSearchKeyDown}
          autoComplete="off"
          placeholder="Search in English or a listed Indian-language name"
          className="fit-input mt-1.5"
        />
        {showResults && query.trim().length >= 2 && (
          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[#e6e3da] bg-[#fffefa] p-1 shadow-xl">
            {catalogLoading && <p role="status" className="p-3 text-sm text-[#697066]">Loading the offline food list…</p>}
            {catalogError && <p role="status" className="p-3 text-sm text-[#697066]">{catalogError}</p>}
            {!catalogLoading && !catalogError && results.length === 0 && catalog.length > 0 && (
              <p className="p-3 text-sm text-[#697066]">No match found. Continue with manual nutrition entry.</p>
            )}
            {results.length > 0 && (
              <ul id={listId} role="listbox" aria-label="Indian foods">
                {results.map((food, index) => (
                  <li key={food.code} role="presentation">
                    <button
                      id={`indian-food-${food.code}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeResult}
                      onMouseEnter={() => setActiveResult(index)}
                      onClick={() => chooseFood(food)}
                      className={`w-full rounded-lg px-3 py-2 text-left ${index === activeResult ? "bg-[#edf1e9]" : "hover:bg-[#f5f7f2]"}`}
                    >
                      <span className="block text-sm font-medium text-[#35483a]">{food.name}</span>
                      <span className="mt-0.5 block text-xs text-[#81877e]">{food.kcalPer100g} kcal · P {food.proteinPer100g} g · C {food.carbsPer100g} g · F {food.fatPer100g} g per 100 g</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {selectedFood && !showResults && (
          <p className="mt-1 text-xs leading-5 text-[#81877e]">
            IFCT 2017 value · {selectedFood.code} · nutrition scales from 100 g edible portion. <button type="button" onClick={() => { setShowResults(true); setQuery(""); }} className="font-semibold text-[#3e5944] underline">Choose another</button>
          </p>
        )}
        {catalogError && !showResults && <p role="status" className="mt-1 text-xs text-[#697066]">{catalogError}</p>}
      </div>

      <label className="col-span-2 text-xs font-medium text-[#62685f] sm:col-span-3">Food name
        <input required maxLength={70} name="name" value={foodName} onChange={(event) => setFoodName(event.target.value)} placeholder="e.g. Oats with milk" className="fit-input mt-1.5" />
      </label>

      <label className="col-span-2 text-xs font-medium text-[#62685f] sm:col-span-4">Portion in grams {selectedFood ? "(catalog values scale to this amount)" : "(optional)"}
        <input name="serving_grams" type="number" min="1" max="5000" step="1" inputMode="numeric" value={portionGrams} required={Boolean(selectedFood)} onChange={selectedFood ? changePortion : (event) => setPortionGrams(event.target.value)} className="fit-input mt-1.5" />
      </label>

      <NutritionField label="Calories (kcal)" name="calories" integer value={nutrition.calories} onChange={(value) => setNutrition((previous) => ({ ...previous, calories: value }))} />
      <NutritionField label="Protein (g)" name="protein_g" value={nutrition.protein_g} onChange={(value) => setNutrition((previous) => ({ ...previous, protein_g: value }))} />
      <NutritionField label="Carbs (g)" name="carbs_g" value={nutrition.carbs_g} onChange={(value) => setNutrition((previous) => ({ ...previous, carbs_g: value }))} />
      <NutritionField label="Fat (g)" name="fat_g" value={nutrition.fat_g} onChange={(value) => setNutrition((previous) => ({ ...previous, fat_g: value }))} />

      <div className="col-span-2 rounded-xl bg-[#f5f7f2] p-3 sm:col-span-4">
        {selectedFood && (
          <>
          <p className="text-xs leading-5 text-[#62685f]">Catalog values are averages; your brand, variety, and preparation may differ. The entry stays marked as guessed until you verify it.</p>
          {selectedFood.localNames && (
            <details className="mt-1 text-xs text-[#81877e]">
              <summary className="w-fit cursor-pointer">Show regional names</summary>
              <p className="mt-1 leading-5">{selectedFood.localNames}</p>
            </details>
          )}
          </>
        )}
        {!selectedFood && <p className="text-xs leading-5 text-[#62685f]">For a manual entry, enter nutrition for the portion you ate. Catalog values are based on the source’s 100 g edible portion and scale when you change the grams.</p>}
        <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-[#76591e]">
          <input type="checkbox" name="is_guessed" value="true" checked={needsChecking} onChange={(event) => setNeedsChecking(event.target.checked)} />
          Mark nutrition as guessed or still needing verification
        </label>
      </div>
    </>
  );
}

function NutritionField({ label, name, value, onChange, integer = false }: { label: string; name: keyof FoodNutrition; value: string; onChange: (value: string) => void; integer?: boolean }) {
  return (
    <label className="text-xs font-medium text-[#62685f]">{label}
      <input type="number" inputMode={integer ? "numeric" : "decimal"} name={name} required min="0" max={integer ? 20000 : 1000} step={integer ? 1 : "0.1"} value={value} onChange={(event) => onChange(event.target.value)} className="fit-input mt-1.5" />
    </label>
  );
}

function formatNutrition(nutrition: FoodNutrition | null): Record<keyof FoodNutrition, string> {
  return nutrition
    ? {
        calories: String(nutrition.calories),
        protein_g: String(nutrition.protein_g),
        carbs_g: String(nutrition.carbs_g),
        fat_g: String(nutrition.fat_g),
      }
    : emptyNutrition;
}
