"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const draftPrefix = "fitlog-form-draft:";
const pendingDraftKey = "fitlog-pending-draft";
const successParams = ["saved", "exerciseSaved", "profileSaved", "profileUpdated", "passwordSaved", "weightSaved"];
let validationErrorSequence = 0;

type FieldSnapshot = {
  name: string;
  type: string;
  value: string;
  checked?: boolean;
};

function showDraftStatus(form: HTMLFormElement, message: string) {
  const status = form.querySelector<HTMLElement>("[data-draft-status]");
  if (status) status.textContent = message;
}

function showValidationError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const errorId = field.dataset.validationErrorId ?? `fit-field-error-${++validationErrorSequence}`;
  field.dataset.validationErrorId = errorId;
  field.setAttribute("aria-invalid", "true");

  const describedBy = new Set((field.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
  describedBy.add(errorId);
  field.setAttribute("aria-describedby", [...describedBy].join(" "));

  let error = document.getElementById(errorId);
  if (!error) {
    error = document.createElement("p");
    error.id = errorId;
    error.className = "fit-field-error";
    error.setAttribute("role", "status");
    error.setAttribute("aria-live", "polite");
    (field.closest("label") ?? field).insertAdjacentElement("afterend", error);
  }
  error.textContent = field.validationMessage || "Check this field and try again.";
}

function clearValidationError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const errorId = field.dataset.validationErrorId;
  if (!errorId) return;

  document.getElementById(errorId)?.remove();
  delete field.dataset.validationErrorId;
  field.removeAttribute("aria-invalid");

  const describedBy = (field.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter((id) => id && id !== errorId);
  if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
  else field.removeAttribute("aria-describedby");
}

function isValidatableField(value: EventTarget | null): value is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement;
}

function isFieldSnapshotArray(value: unknown): value is FieldSnapshot[] {
  return Array.isArray(value) && value.every((field) =>
    field !== null &&
    typeof field === "object" &&
    typeof field.name === "string" &&
    typeof field.type === "string" &&
    typeof field.value === "string" &&
    (field.checked === undefined || typeof field.checked === "boolean"),
  );
}

function snapshotForm(form: HTMLFormElement): FieldSnapshot[] {
  return Array.from(form.elements)
    .filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) &&
      Boolean(element.name) &&
      !["hidden", "password", "submit", "button", "reset", "file"].includes(element.type) &&
      !element.disabled,
    )
    .map((element) => ({
      name: element.name,
      type: element.type,
      value: element.value,
      ...("checked" in element ? { checked: element.checked } : {}),
    }));
}

function restoreForm(form: HTMLFormElement, fields: FieldSnapshot[]) {
  const elements = Array.from(form.elements);
  const used = new Set<Element>();
  for (const field of fields) {
    const element = elements.find((candidate) =>
      !used.has(candidate) &&
      candidate instanceof HTMLElement &&
      "name" in candidate &&
      candidate.name === field.name &&
      "type" in candidate &&
      candidate.type === field.type,
    );
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
    used.add(element);
    if ("checked" in element && field.checked !== undefined) element.checked = field.checked;
    else element.value = field.value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function clearDrafts(timers: Map<HTMLFormElement, ReturnType<typeof setTimeout>>) {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(draftPrefix)) sessionStorage.removeItem(key);
    }
    sessionStorage.removeItem(pendingDraftKey);
    return true;
  } catch {
    return false;
  }
}

export function FormEnhancements() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    const draftTimers = new Map<HTMLFormElement, ReturnType<typeof setTimeout>>();
    document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
      form.noValidate = true;
    });
    const params = new URLSearchParams(search);
    if (params.get("dataCleared") === "1" && !clearDrafts(draftTimers)) {
      const status = document.querySelector<HTMLElement>("[data-clear-data-status]");
      if (status) status.textContent = "Your FitLog data was deleted, but this tab could not clear its session-only drafts. Close this tab to remove any remaining drafts.";
    }
    const saved = successParams.some((param) => params.has(param) && params.get(param) !== "0") ||
      (params.has("memoryMessage") && !["error", "invalid"].includes(params.get("memoryMessage") ?? ""));
    let pendingKey: string | null = null;
    try {
      pendingKey = sessionStorage.getItem(pendingDraftKey);
    } catch {
      document.querySelectorAll<HTMLFormElement>("form[data-draft-key]").forEach((form) =>
        showDraftStatus(form, "Draft storage is unavailable in this browser; keep this tab open while editing."),
      );
    }
    if (saved && pendingKey) {
      try {
        sessionStorage.removeItem(`${draftPrefix}${pendingKey}`);
        sessionStorage.removeItem(pendingDraftKey);
      } catch {
        document.querySelectorAll<HTMLFormElement>("form[data-draft-key]").forEach((form) =>
          showDraftStatus(form, "This browser could not clear the saved draft. Sign out to clear local drafts."),
        );
      }
    }

    document.querySelectorAll<HTMLFormElement>("form[data-draft-key]").forEach((form) => {
      const key = form.dataset.draftKey;
      if (!key || (saved && key === pendingKey)) return;
      let encoded: string | null;
      try {
        encoded = sessionStorage.getItem(`${draftPrefix}${key}`);
      } catch {
        showDraftStatus(form, "Draft storage is unavailable in this browser; keep this tab open while editing.");
        return;
      }
      if (!encoded) return;
      try {
        const fields: unknown = JSON.parse(encoded);
        if (isFieldSnapshotArray(fields)) restoreForm(form, fields);
        else {
          sessionStorage.removeItem(`${draftPrefix}${key}`);
          showDraftStatus(form, "A saved draft could not be restored. Your current entries are unchanged.");
        }
      } catch {
        try {
          sessionStorage.removeItem(`${draftPrefix}${key}`);
        } catch {
          showDraftStatus(form, "A saved draft could not be restored or cleared. Your current entries are unchanged.");
        }
      }
    });

    function handleChange(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (isValidatableField(target) && target.dataset.validationErrorId) {
        if (target.validity.valid) clearValidationError(target);
        else showValidationError(target);
      }
      const form = target.closest<HTMLFormElement>("form[data-draft-key]");
      const key = form?.dataset.draftKey;
      if (!form || !key) return;
      try {
        sessionStorage.removeItem(pendingDraftKey);
      } catch {
        showDraftStatus(form, "This browser could not track changes to the draft.");
      }
      const previousTimer = draftTimers.get(form);
      if (previousTimer) clearTimeout(previousTimer);
      draftTimers.set(form, setTimeout(() => {
        try {
          sessionStorage.setItem(`${draftPrefix}${key}`, JSON.stringify(snapshotForm(form)));
        } catch {
          showDraftStatus(form, "This browser could not save the draft. Keep this tab open to avoid losing your changes.");
        }
        draftTimers.delete(form);
      }, 200));
    }

    function handleBlur(event: FocusEvent) {
      if (!isValidatableField(event.target) || !event.target.willValidate) return;
      if (event.target.validity.valid) clearValidationError(event.target);
      else showValidationError(event.target);
    }

    function handleInvalid(event: Event) {
      if (isValidatableField(event.target)) showValidationError(event.target);
    }

    function handleValidationSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.checkValidity()) return;
      event.preventDefault();
      event.stopPropagation();
      form.querySelector<HTMLElement>(":invalid")?.focus();
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return;
      if (form.dataset.clearDraftsOnSubmit === "true") {
        if (!clearDrafts(draftTimers)) {
          event.preventDefault();
          window.alert("FitLog could not clear this tab’s saved drafts. Please close this tab and try signing out again.");
        }
        return;
      }
      const key = form.dataset.draftKey;
      const timer = draftTimers.get(form);
      if (timer) clearTimeout(timer);
      draftTimers.delete(form);
      try {
        if (key) {
          sessionStorage.setItem(`${draftPrefix}${key}`, JSON.stringify(snapshotForm(form)));
          sessionStorage.setItem(pendingDraftKey, key);
        }
        else sessionStorage.removeItem(pendingDraftKey);
      } catch {
        if (key) showDraftStatus(form, "This browser could not track this form submission.");
      }

      const submitter = event.submitter;
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        submitter.dataset.originalLabel ??= submitter instanceof HTMLButtonElement ? submitter.textContent ?? "" : submitter.value;
        const label = submitter.dataset.pendingLabel ?? "Saving…";
        if (submitter instanceof HTMLButtonElement) submitter.textContent = label;
        else submitter.value = label;
      }
      form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]')
        .forEach((button) => {
          button.dataset.wasDisabled = String(button.disabled);
          button.disabled = true;
        });
      form.setAttribute("aria-busy", "true");
    }

    function resetPendingForms() {
      document.querySelectorAll<HTMLFormElement>('form[aria-busy="true"]').forEach((form) => {
        form.removeAttribute("aria-busy");
        form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]')
          .forEach((button) => {
            button.disabled = button.dataset.wasDisabled === "true";
            delete button.dataset.wasDisabled;
            const label = button.dataset.originalLabel;
            if (label !== undefined) {
              if (button instanceof HTMLButtonElement) button.textContent = label;
              else button.value = label;
              delete button.dataset.originalLabel;
            }
          });
      });
    }

    document.addEventListener("input", handleChange);
    document.addEventListener("change", handleChange);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("blur", handleBlur, true);
    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("submit", handleValidationSubmit, true);
    window.addEventListener("pageshow", resetPendingForms);
    return () => {
      document.removeEventListener("input", handleChange);
      document.removeEventListener("change", handleChange);
      document.removeEventListener("submit", handleSubmit);
      document.removeEventListener("blur", handleBlur, true);
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("submit", handleValidationSubmit, true);
      window.removeEventListener("pageshow", resetPendingForms);
      for (const timer of draftTimers.values()) clearTimeout(timer);
    };
  }, [pathname, search]);

  return null;
}
