import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { FormEnhancements } from "@/components/form-enhancements";
import { FitLogCoach } from "@/components/fitlog-coach";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitLog",
  description: "Your personal health goals, in one calm place.",
  applicationName: "FitLog",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FitLog", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/fitlog-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/fitlog-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/fitlog-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Suspense fallback={null}><FormEnhancements /></Suspense>{children}<InstallAppPrompt /><FitLogCoach /></body></html>;
}
