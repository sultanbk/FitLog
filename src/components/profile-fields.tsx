"use client";

import { useState } from "react";
import { suggestedGoalDurationDays } from "@/lib/calorie-target";
import { FormSubmitButton } from "@/components/form-submit-button";

export type EditableProfile = {
  age_years: number;
  sex: "female" | "male";
  activity_level: "sedentary" | "light" | "moderate" | "active";
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  goal_duration_days: number;
};

export function ProfileFields({ initialProfile, submitLabel = "Save and see my target" }: { initialProfile?: EditableProfile; submitLabel?: string }) {
  const [currentWeight, setCurrentWeight] = useState(initialProfile ? String(initialProfile.current_weight_kg) : "");
  const [goalWeight, setGoalWeight] = useState(initialProfile ? String(initialProfile.goal_weight_kg) : "");
  const timelineNeeded = currentWeight !== "" && goalWeight !== "" && Number(currentWeight) !== Number(goalWeight);
  const suggestedDays = timelineNeeded ? suggestedGoalDurationDays(Number(currentWeight), Number(goalWeight)) : null;
  const [preferredDuration, setPreferredDuration] = useState(initialProfile && initialProfile.current_weight_kg !== initialProfile.goal_weight_kg ? String(initialProfile.goal_duration_days) : "");
  const durationValue = preferredDuration || (suggestedDays !== null && suggestedDays <= 3650 ? String(suggestedDays) : "");

  return <>
    <Field id="age_years" label="Age" unit="years" min="18" max="100" step="1" defaultValue={initialProfile ? String(initialProfile.age_years) : undefined} />
    <SelectField id="sex" label="Sex used for the resting-energy estimate" defaultValue={initialProfile?.sex ?? ""} options={[["female", "Female"], ["male", "Male"]]} />
    <SelectField id="activity_level" label="Activity level" defaultValue={initialProfile?.activity_level ?? ""} options={[
      ["sedentary", "Sedentary"], ["light", "Light"], ["moderate", "Moderate"], ["active", "Active"],
    ]} />
    <Field id="height_cm" label="Height" unit="cm" min="80" max="250" step="0.1" defaultValue={initialProfile ? String(initialProfile.height_cm) : undefined} />
    <Field id="current_weight_kg" label="Current weight" unit="kg" min="25" max="350" step="0.1" inputMode="decimal" value={currentWeight} onChange={(value) => { setCurrentWeight(value); setPreferredDuration(""); }} />
    <Field id="goal_weight_kg" label="Goal weight" unit="kg" min="25" max="350" step="0.1" inputMode="decimal" value={goalWeight} onChange={(value) => { setGoalWeight(value); setPreferredDuration(""); }} />
    <div hidden={!timelineNeeded}>
      {suggestedDays !== null && <p className="mb-3 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">Suggested timeline with FitLog’s pace cap: <strong>{suggestedDays} days</strong>{suggestedDays > 3650 ? " (more than 10 years; consider setting a nearer goal weight)" : "."}</p>}
      <Field id="goal_duration_days" label="Preferred timeline" unit="days" min="14" max="3650" step="1" inputMode="numeric" required={timelineNeeded} value={durationValue} onChange={setPreferredDuration} />
      <p className="mt-1 text-xs text-[#81877e]">You can choose a different timeline. If it exceeds the pace cap, FitLog will show the adjusted estimate.</p>
    </div>
    {currentWeight !== "" && goalWeight !== "" && !timelineNeeded && <p className="text-sm text-[#81877e]">No timeline is needed for a maintenance goal.</p>}
    <FormSubmitButton pendingLabel="Saving…" className="fit-button-primary w-full">{submitLabel}</FormSubmitButton>
  </>;
}

function SelectField({ id, label, defaultValue, options }: { id: string; label: string; defaultValue: string; options: [string, string][] }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><select id={id} name={id} required defaultValue={defaultValue} className="fit-input"><option value="" disabled>Select one</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>;
}

function Field({ id, label, unit, min, max, step, value, defaultValue, onChange, required = true, inputMode }: { id: string; label: string; unit: string; min: string; max: string; step: string; value?: string; defaultValue?: string; onChange?: (value: string) => void; required?: boolean; inputMode?: "numeric" | "decimal" }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><div className="relative"><input id={id} name={id} type="number" inputMode={inputMode ?? (step === "1" ? "numeric" : "decimal")} required={required} min={min} max={max} step={step} value={value} defaultValue={defaultValue} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="fit-input pr-16" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#81877e]">{unit}</span></div></div>;
}