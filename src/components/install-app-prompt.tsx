"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem("fitlog-install-dismissed") === "1");
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function dismiss() {
    window.sessionStorage.setItem("fitlog-install-dismissed", "1");
    setDismissed(true);
  }

  if (!installPrompt || dismissed) return null;

  return (
    <aside className="fit-install-prompt" aria-label="Install FitLog">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#35483a]">Keep FitLog close</p>
        <p className="mt-0.5 text-xs leading-5 text-[#697066]">Add the app to your home screen for easy access.</p>
      </div>
      <button type="button" onClick={install} className="fit-button-primary shrink-0 px-3 py-2 text-sm">Install</button>
      <button type="button" onClick={dismiss} aria-label="Dismiss install suggestion" className="grid size-9 shrink-0 place-items-center rounded-lg text-lg text-[#697066] hover:bg-[#eeeee5]">×</button>
    </aside>
  );
}
