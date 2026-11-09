"use client";

import { useState } from "react";
import { suggestedGoalDurationDays } from "@/lib/calorie-target";

export function ProfileFields() {
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const timelineNeeded = currentWeight !== "" && goalWeight !== "" && Number(currentWeight) !== Number(goalWeight);
  const suggestedDays = timelineNeeded ? suggestedGoalDurationDays(Number(currentWeight), Number(goalWeight)) : null;
  const [preferredDuration, setPreferredDuration] = useState("");
  const durationValue = preferredDuration || (suggestedDays !== null && suggestedDays <= 3650 ? String(suggestedDays) : "");

  return <>
    <Field id="age_years" label="Age" unit="years" min="18" max="100" step="1" />
    <SelectField id="sex" label="Sex used for the resting-energy estimate" options={[["female", "Female"], ["male", "Male"]]} />
    <SelectField id="activity_level" label="Activity level" options={[
      ["sedentary", "Sedentary"], ["light", "Light"], ["moderate", "Moderate"], ["active", "Active"],
    ]} />
    <Field id="height_cm" label="Height" unit="cm" min="80" max="250" step="0.1" />
    <Field id="current_weight_kg" label="Current weight" unit="kg" min="25" max="350" step="0.1" value={currentWeight} onChange={(value) => { setCurrentWeight(value); setPreferredDuration(""); }} />
    <Field id="goal_weight_kg" label="Goal weight" unit="kg" min="25" max="350" step="0.1" value={goalWeight} onChange={(value) => { setGoalWeight(value); setPreferredDuration(""); }} />
    <div hidden={!timelineNeeded}>
      {suggestedDays !== null && <p className="mb-3 rounded-xl bg-[#edf5e9] p-3 text-sm text-[#335c2c]">Suggested timeline with FitLog’s pace cap: <strong>{suggestedDays} days</strong>{suggestedDays > 3650 ? " (more than 10 years; consider setting a nearer goal weight)" : "."}</p>}
      <Field id="goal_duration_days" label="Preferred timeline" unit="days" min="14" max="3650" step="1" required={timelineNeeded} value={durationValue} onChange={setPreferredDuration} />
      <p className="mt-1 text-xs text-[#81877e]">You can choose a different timeline. If it exceeds the pace cap, FitLog will show the adjusted estimate.</p>
    </div>
    {currentWeight !== "" && goalWeight !== "" && !timelineNeeded && <p className="text-sm text-[#81877e]">No timeline is needed for a maintenance goal.</p>}
    <button className="w-full rounded-xl bg-[#315c35] px-4 py-3 font-medium text-white hover:bg-[#264b2b]">Save and see my target</button>
  </>;
}

function SelectField({ id, label, options }: { id: string; label: string; options: [string, string][] }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><select id={id} name={id} required defaultValue="" className="w-full rounded-xl border border-[#dfe3d9] bg-white px-4 py-3 outline-none focus:border-[#57834d]"><option value="" disabled>Select one</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>;
}

function Field({ id, label, unit, min, max, step, value, onChange, required = true }: { id: string; label: string; unit: string; min: string; max: string; step: string; value?: string; onChange?: (value: string) => void; required?: boolean }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label><div className="relative"><input id={id} name={id} type="number" required={required} min={min} max={max} step={step} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="w-full rounded-xl border border-[#dfe3d9] px-4 py-3 pr-16 outline-none focus:border-[#57834d]" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#81877e]">{unit}</span></div></div>;
}
