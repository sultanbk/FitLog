import type { Metadata } from "next";
import { Suspense } from "react";
import { FormEnhancements } from "@/components/form-enhancements";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitLog",
  description: "Your personal health goals, in one calm place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Suspense fallback={null}><FormEnhancements /></Suspense>{children}</body></html>;
}
